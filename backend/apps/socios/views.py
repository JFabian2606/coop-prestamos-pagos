import io
import json
from datetime import datetime

from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter
from drf_spectacular.utils import extend_schema, OpenApiResponse
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .audit import snapshot_socio, register_audit_entry
from .models import Socio, SocioAuditLog
from .serializers import (
    ProfileCreateSerializer,
    SocioAdminUpdateSerializer,
    SocioEstadoSerializer,
    SocioSerializer,
)

HEADER_FONT = Font(bold=True, color="FFFFFF")
HEADER_FILL = PatternFill("solid", fgColor="43A59D")


def style_header_row(ws, row_idx: int = 1):
    """Apply a simple header style to the given row."""
    for cell in ws[row_idx]:
        cell.font = HEADER_FONT
        cell.fill = HEADER_FILL
        cell.alignment = Alignment(horizontal="center", vertical="center")


def wrap_columns(ws, col_letters: list[str]):
    """Enable wrap_text for the provided columns (skip header)."""
    for col in col_letters:
        for cell in ws[col][1:]:
            cell.alignment = Alignment(wrap_text=True, vertical="top")


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        socio = getattr(request.user, 'socio', None)
        if not socio:
            return Response({'detail': 'Perfil de socio no encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(SocioSerializer(socio).data)


class ProfileUpsertView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ProfileCreateSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        socio = serializer.save()
        return Response(SocioSerializer(socio).data, status=status.HTTP_201_CREATED)


class SocioListView(APIView):
    permission_classes = [permissions.IsAdminUser]

    @extend_schema(
        tags=['Socios'],
        responses=SocioSerializer(many=True),
        summary='Listado de socios',
        description='Devuelve todos los socios registrados. Solo administradores.',
    )
    def get(self, _request):
        queryset = Socio.objects.select_related('usuario').order_by('nombre_completo')
        return Response(SocioSerializer(queryset, many=True).data)


class SocioAdminDetailView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get_object(self, socio_id):
        return get_object_or_404(Socio.objects.select_related('usuario'), pk=socio_id)

    @extend_schema(
        tags=['Socios'],
        responses=SocioSerializer,
        summary='Detalle socio',
        description='Obtiene la información completa de un socio específico',
    )
    def get(self, _request, socio_id):
        socio = self.get_object(socio_id)
        return Response(SocioSerializer(socio).data)

    @extend_schema(
        tags=['Socios'],
        request=SocioAdminUpdateSerializer,
        responses={
            200: SocioSerializer,
            400: OpenApiResponse(description='Errores de validación'),
            404: OpenApiResponse(description='Socio no encontrado'),
        },
        summary='Actualización completa',
        description='Actualiza campos permitidos del socio. No permite modificar estado o campos críticos.',
    )
    def put(self, request, socio_id):
        socio = self.get_object(socio_id)
        serializer = SocioAdminUpdateSerializer(instance=socio, data=request.data)
        serializer.is_valid(raise_exception=True)
        before = snapshot_socio(socio)
        socio = serializer.save()
        after = snapshot_socio(socio)
        register_audit_entry(
            socio=socio,
            user=request.user,
            action=SocioAuditLog.Actions.UPDATE,
            before=before,
            after=after,
        )
        return Response(SocioSerializer(socio).data)

    @extend_schema(
        tags=['Socios'],
        responses={
            200: SocioSerializer,
            404: OpenApiResponse(description='Socio no encontrado'),
        },
        summary='Baja lógica de socio',
        description='Marca al socio como inactivo (baja lógica). Solo administradores.',
    )
    def delete(self, _request, socio_id):
        socio = self.get_object(socio_id)
        before = snapshot_socio(socio)
        if socio.estado != Socio.ESTADO_INACTIVO:
            socio.estado = Socio.ESTADO_INACTIVO
            socio.save(update_fields=['estado', 'updated_at'])
            after = snapshot_socio(socio)
            register_audit_entry(
                socio=socio,
                user=getattr(_request, 'user', None),
                action=SocioAuditLog.Actions.STATE_CHANGE,
                before=before,
                after=after,
                metadata={'motivo': 'baja_logica'},
            )
        return Response(SocioSerializer(socio).data, status=status.HTTP_200_OK)


class SocioEstadoUpdateView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get_object(self, socio_id):
        return get_object_or_404(Socio, pk=socio_id)

    @extend_schema(
        tags=['Socios'],
        request=SocioEstadoSerializer,
        responses={
            200: SocioSerializer,
            400: OpenApiResponse(description='Transición no permitida o datos inválidos'),
            404: OpenApiResponse(description='Socio no encontrado'),
        },
        summary='Cambio de estado',
        description='Cambia el estado del socio controlando transiciones válidas.',
    )
    def patch(self, request, socio_id):
        socio = self.get_object(socio_id)
        serializer = SocioEstadoSerializer(data=request.data, context={'socio': socio})
        serializer.is_valid(raise_exception=True)
        before = snapshot_socio(socio)
        socio.estado = serializer.validated_data['estado']
        socio.save(update_fields=['estado', 'updated_at'])
        after = snapshot_socio(socio)
        register_audit_entry(
            socio=socio,
            user=request.user,
            action=SocioAuditLog.Actions.STATE_CHANGE,
            before=before,
            after=after,
            metadata={'motivo': serializer.validated_data.get('motivo') or ''},
        )
        return Response(SocioSerializer(socio).data)


class SocioExportView(APIView):
    permission_classes = [permissions.IsAdminUser]

    @extend_schema(
        tags=['Socios'],
        summary='Exportar socios y auditoria a Excel',
        description=(
            'Genera un archivo Excel con los socios (filtrables por estado) '
            'y el historial de auditoria de cambios, filtrable por rango de fechas y accion.'
        ),
        responses={200: OpenApiResponse(description='Excel exportado')},
    )
    def get(self, request):
        estados_param = request.query_params.get('estado')
        estados = {e.strip() for e in estados_param.split(',')} if estados_param else set()
        accion = request.query_params.get('accion') or None
        desde_param = request.query_params.get('desde')
        hasta_param = request.query_params.get('hasta')

        def parse_dt(value: str):
            try:
                parsed = datetime.fromisoformat(value)
                return parsed if parsed.tzinfo else timezone.make_aware(parsed)
            except Exception:
                return None

        desde = parse_dt(desde_param) if desde_param else None
        hasta = parse_dt(hasta_param) if hasta_param else None

        socios_qs = Socio.objects.select_related('usuario').order_by('nombre_completo')
        if estados:
            socios_qs = socios_qs.filter(estado__in=estados)

        audit_qs = SocioAuditLog.objects.select_related('socio', 'performed_by').order_by('-created_at')
        if accion:
            audit_qs = audit_qs.filter(action=accion)
        if desde:
            audit_qs = audit_qs.filter(created_at__gte=desde)
        if hasta:
            audit_qs = audit_qs.filter(created_at__lte=hasta)

        wb = Workbook()

        # Resumen / filtros aplicados
        ws_meta = wb.active
        ws_meta.title = "Resumen"
        now = timezone.localtime()
        ws_meta.append(["Reporte generado"])
        ws_meta.append(["Generado por", getattr(request.user, 'email', '')])
        ws_meta.append(["Fecha/Hora", now.strftime("%Y-%m-%d %H:%M:%S %Z")])
        ws_meta.append(["Filtros", ""])
        ws_meta.append(["  Estado", ", ".join(sorted(estados)) if estados else "Todos"])
        ws_meta.append(["  Accion (auditoria)", accion or "Todas"])
        ws_meta.append(["  Desde", desde.strftime("%Y-%m-%d %H:%M:%S") if desde else ""])
        ws_meta.append(["  Hasta", hasta.strftime("%Y-%m-%d %H:%M:%S") if hasta else ""])
        for cell in ws_meta["A"]:
            cell.font = Font(bold=True)

        # Hoja de socios
        ws_socios = wb.create_sheet("Socios")
        socios_headers = [
            "ID", "Nombre", "Documento", "Estado", "Email usuario",
            "Telefono", "Direccion", "Fecha alta", "Creado", "Actualizado",
            "Usuario ID",
        ]
        ws_socios.append(socios_headers)
        for socio in socios_qs:
            ws_socios.append([
                str(socio.id),
                socio.nombre_completo,
                socio.documento or "",
                socio.estado,
                socio.usuario.email if socio.usuario else "",
                socio.telefono or "",
                socio.direccion or "",
                socio.fecha_alta.isoformat() if socio.fecha_alta else "",
                socio.created_at.isoformat(),
                socio.updated_at.isoformat(),
                str(socio.usuario.id) if socio.usuario else "",
            ])
        style_header_row(ws_socios)
        ws_socios.freeze_panes = "A2"
        ws_socios.auto_filter.ref = f"A1:{get_column_letter(len(socios_headers))}{ws_socios.max_row}"
        for idx in range(1, len(socios_headers) + 1):
            ws_socios.column_dimensions[get_column_letter(idx)].width = 18

        # Hoja de auditoria
        ws_audit = wb.create_sheet("Auditoria")
        audit_headers = [
            "ID", "Socio ID", "Socio", "Email", "Accion",
            "Estado anterior", "Estado nuevo", "Campos modificados",
            "Datos previos", "Datos nuevos", "Metadata",
            "Ejecutado por", "Fecha",
        ]
        ws_audit.append(audit_headers)
        for entry in audit_qs:
            socio = entry.socio
            ws_audit.append([
                entry.id,
                str(socio.id) if socio else "",
                socio.nombre_completo if socio else "",
                socio.usuario.email if socio and socio.usuario else "",
                entry.action,
                entry.estado_anterior,
                entry.estado_nuevo,
                ", ".join(entry.campos_modificados or []),
                json.dumps(entry.datos_previos or {}, ensure_ascii=False),
                json.dumps(entry.datos_nuevos or {}, ensure_ascii=False),
                json.dumps(entry.metadata or {}, ensure_ascii=False),
                entry.performed_by.email if entry.performed_by else "",
                entry.created_at.isoformat(),
            ])
        style_header_row(ws_audit)
        ws_audit.freeze_panes = "A2"
        ws_audit.auto_filter.ref = f"A1:{get_column_letter(len(audit_headers))}{ws_audit.max_row}"
        wrap_columns(ws_audit, ["H", "I", "J", "K"])
        for idx in range(1, len(audit_headers) + 1):
            ws_audit.column_dimensions[get_column_letter(idx)].width = 20

        # Preparar respuesta
        output = io.BytesIO()
        wb.save(output)
        output.seek(0)
        filename = f"socios_auditoria_{now.strftime('%Y%m%d_%H%M%S')}.xlsx"

        response = HttpResponse(
            output.getvalue(),
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response
