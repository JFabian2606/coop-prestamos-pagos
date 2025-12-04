import io
import json
from datetime import datetime, date

from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Q
from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter
from drf_spectacular.utils import extend_schema, OpenApiResponse
from rest_framework import permissions, status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from .audit import snapshot_socio, register_audit_entry
from .models import Prestamo, Socio, SocioAuditLog, TipoPrestamo
from .serializers import (
    HistorialCrediticioSerializer,
    ProfileCreateSerializer,
    SocioAdminUpdateSerializer,
    SocioEstadoSerializer,
    SocioSerializer,
    TipoPrestamoSerializer,
    TipoPrestamoUpsertSerializer,
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
    def get(self, request):
        queryset = Socio.objects.select_related('usuario').order_by('nombre_completo')

        q = (request.query_params.get('q') or '').strip()
        if q:
            queryset = queryset.filter(
                Q(nombre_completo__icontains=q)
                | Q(documento__icontains=q)
                | Q(usuario__email__icontains=q)
                | Q(id__icontains=q)
            )

        return Response(SocioSerializer(queryset, many=True).data)


class TipoPrestamoListCreateView(APIView):
    permission_classes = [permissions.IsAdminUser]

    @extend_schema(
        tags=['Prestamos'],
        responses=TipoPrestamoSerializer(many=True),
        summary='Listado de tipos de préstamo',
        description='Devuelve los tipos de préstamo configurados. Solo administradores.',
    )
    def get(self, request):
        qs = TipoPrestamo.objects.all().order_by('nombre')
        q = (request.query_params.get('q') or '').strip()
        if q:
            qs = qs.filter(Q(nombre__icontains=q) | Q(descripcion__icontains=q))

        solo_activos = request.query_params.get('solo_activos') or request.query_params.get('soloActivos')
        if solo_activos and str(solo_activos).lower() in {'1', 'true', 't', 'yes', 'on'}:
            qs = qs.filter(activo=True)

        return Response(TipoPrestamoSerializer(qs, many=True).data)

    @extend_schema(
        tags=['Prestamos'],
        request=TipoPrestamoUpsertSerializer,
        responses={201: TipoPrestamoSerializer, 400: OpenApiResponse(description='Datos inválidos')},
        summary='Crear tipo de préstamo',
        description='Registra un nuevo tipo de préstamo con tasa, plazo y requisitos.',
    )
    def post(self, request):
        serializer = TipoPrestamoUpsertSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        tipo = serializer.save()
        return Response(TipoPrestamoSerializer(tipo).data, status=status.HTTP_201_CREATED)


class TipoPrestamoDetailView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get_object(self, tipo_id):
        return get_object_or_404(TipoPrestamo, pk=tipo_id)

    @extend_schema(
        tags=['Prestamos'],
        responses={200: TipoPrestamoSerializer, 404: OpenApiResponse(description='Tipo no encontrado')},
        summary='Detalle de tipo de préstamo',
        description='Obtiene la definición completa de un tipo de préstamo.',
    )
    def get(self, _request, tipo_id):
        tipo = self.get_object(tipo_id)
        return Response(TipoPrestamoSerializer(tipo).data)

    @extend_schema(
        tags=['Prestamos'],
        request=TipoPrestamoUpsertSerializer,
        responses={200: TipoPrestamoSerializer, 400: OpenApiResponse(description='Datos inválidos')},
        summary='Actualizar tipo de préstamo',
        description='Permite modificar tasa, plazo, requisitos o estado activo.',
    )
    def put(self, request, tipo_id):
        tipo = self.get_object(tipo_id)
        serializer = TipoPrestamoUpsertSerializer(instance=tipo, data=request.data)
        serializer.is_valid(raise_exception=True)
        tipo = serializer.save()
        return Response(TipoPrestamoSerializer(tipo).data)

    @extend_schema(
        tags=['Prestamos'],
        request=TipoPrestamoUpsertSerializer,
        responses={200: TipoPrestamoSerializer, 400: OpenApiResponse(description='Datos inválidos')},
        summary='Actualización parcial de tipo de préstamo',
        description='Actualiza parcialmente un tipo de préstamo.',
    )
    def patch(self, request, tipo_id):
        tipo = self.get_object(tipo_id)
        serializer = TipoPrestamoUpsertSerializer(instance=tipo, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        tipo = serializer.save()
        return Response(TipoPrestamoSerializer(tipo).data)

    @extend_schema(
        tags=['Prestamos'],
        responses={200: TipoPrestamoSerializer, 404: OpenApiResponse(description='Tipo no encontrado')},
        summary='Desactivar tipo de préstamo',
        description='Desactiva (soft delete) un tipo de préstamo para que no se use en nuevos créditos.',
    )
    def delete(self, _request, tipo_id):
        tipo = self.get_object(tipo_id)
        if tipo.activo:
            tipo.activo = False
            tipo.save(update_fields=['activo', 'updated_at'])
        return Response(TipoPrestamoSerializer(tipo).data, status=status.HTTP_200_OK)


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


class SocioHistorialView(APIView):
    permission_classes = [permissions.IsAdminUser]

    @extend_schema(
        tags=['Socios'],
        responses={200: HistorialCrediticioSerializer},
        summary='Historial crediticio de un socio',
        description='Devuelve los préstamos previos del socio y sus pagos, filtrables por estado y rango de fechas.',
    )
    def get(self, request, socio_id=None):
        socio = get_object_or_404(Socio, pk=socio_id) if socio_id else None

        estados_param = request.query_params.get('estado') or ''
        estados = {e.strip() for e in estados_param.split(',') if e.strip()}
        estados_validos = set(Prestamo.Estados.values)
        if estados and not estados.issubset(estados_validos):
            desconocidos = estados - estados_validos
            raise ValidationError({'estado': [f"Estado(s) desconocido(s): {', '.join(desconocidos)}"]})

        def parse_date(param_name: str):
            valor = request.query_params.get(param_name)
            if not valor:
                return None
            try:
                return datetime.fromisoformat(valor).date()
            except Exception:
                raise ValidationError({param_name: 'Usa formato ISO AAAA-MM-DD.'})

        desde = parse_date('desde')
        hasta = parse_date('hasta')

        prestamos_qs = Prestamo.objects.filter(socio=socio) if socio else Prestamo.objects.all()
        prestamos_qs = prestamos_qs.select_related('socio', 'tipo').prefetch_related('pagos').order_by('-fecha_desembolso')
        if estados:
            prestamos_qs = prestamos_qs.filter(estado__in=estados)
        if desde:
            prestamos_qs = prestamos_qs.filter(fecha_desembolso__gte=desde)
        if hasta:
            prestamos_qs = prestamos_qs.filter(fecha_desembolso__lte=hasta)

        prestamos = []
        for prestamo in prestamos_qs:
            pagos_qs = prestamo.pagos.all()
            if desde:
                pagos_qs = pagos_qs.filter(fecha_pago__gte=desde)
            if hasta:
                pagos_qs = pagos_qs.filter(fecha_pago__lte=hasta)
            prestamo._pagos_filtrados = list(pagos_qs)
            prestamos.append(prestamo)

        serializer = HistorialCrediticioSerializer({
            'socio': socio,
            'prestamos': prestamos,
        })
        return Response(serializer.data)


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


class SocioHistorialExportView(APIView):
    permission_classes = [permissions.IsAdminUser]

    @extend_schema(
        tags=['Socios'],
        summary='Exportar historial crediticio',
        description='Genera un XLSX con los préstamos y pagos del socio (o todos) aplicando los filtros.',
        responses={200: OpenApiResponse(description='Excel exportado')},
    )
    def get(self, request, socio_id=None):
        estados_param = request.query_params.get('estado') or ''
        estados = {e.strip() for e in estados_param.split(',') if e.strip()}
        estados_validos = set(Prestamo.Estados.values)
        if estados and not estados.issubset(estados_validos):
            desconocidos = estados - estados_validos
            raise ValidationError({'estado': [f"Estado(s) desconocido(s): {', '.join(desconocidos)}"]})

        def parse_date(param_name: str):
            valor = request.query_params.get(param_name)
            if not valor:
                return None
            try:
                return datetime.fromisoformat(valor).date()
            except Exception:
                raise ValidationError({param_name: 'Usa formato ISO AAAA-MM-DD.'})

        desde = parse_date('desde')
        hasta = parse_date('hasta')

        socio = None
        if socio_id:
            socio = get_object_or_404(Socio, pk=socio_id)

        prestamos_qs = Prestamo.objects.select_related('socio', 'socio__usuario', 'tipo').prefetch_related('pagos')
        if socio:
            prestamos_qs = prestamos_qs.filter(socio=socio)
        if estados:
            prestamos_qs = prestamos_qs.filter(estado__in=estados)
        if desde:
            prestamos_qs = prestamos_qs.filter(fecha_desembolso__gte=desde)
        if hasta:
            prestamos_qs = prestamos_qs.filter(fecha_desembolso__lte=hasta)

        wb = Workbook()

        ws_meta = wb.active
        ws_meta.title = "Resumen"
        now = timezone.localtime()
        ws_meta.append(["Reporte generado"])
        ws_meta.append(["Generado por", getattr(request.user, 'email', '')])
        ws_meta.append(["Fecha/Hora", now.strftime("%Y-%m-%d %H:%M:%S %Z")])
        ws_meta.append(["Socio", socio.nombre_completo if socio else "Todos"])
        ws_meta.append(["Filtros", ""])
        ws_meta.append(["  Estado", ", ".join(sorted(estados)) if estados else "Todos"])
        ws_meta.append(["  Desde", desde.strftime("%Y-%m-%d") if desde else ""])
        ws_meta.append(["  Hasta", hasta.strftime("%Y-%m-%d") if hasta else ""])
        for cell in ws_meta["A"]:
            cell.font = Font(bold=True)

        # Hoja de prestamos
        ws_prestamos = wb.create_sheet("Prestamos")
        headers_prestamos = [
            "ID", "Tipo", "Tasa anual", "Plazo (meses)", "Socio", "Documento", "Estado",
            "Monto", "Pagado", "Saldo", "Monto en mora",
            "Días mora", "Cuotas vencidas",
            "Desembolso", "Vencimiento", "Descripción",
        ]
        ws_prestamos.append(headers_prestamos)
        for p in prestamos_qs:
            total_pagado = sum((pg.monto for pg in p.pagos.all()), 0)
            saldo = p.monto - total_pagado
            saldo = saldo if saldo > 0 else 0
            dias_mora = 0
            if p.fecha_vencimiento:
                hoy = date.today()
                if p.fecha_vencimiento < hoy and saldo > 0:
                    dias_mora = (hoy - p.fecha_vencimiento).days
            cuotas_vencidas = max(1, (dias_mora + 29) // 30) if dias_mora > 0 else 0
            monto_mora = saldo if dias_mora > 0 else 0
            socio_name = p.socio.nombre_completo if p.socio else ""
            socio_doc = p.socio.documento if p.socio else ""
            tipo_nombre = p.tipo.nombre if p.tipo else ""
            tipo_tasa = float(p.tipo.tasa_interes_anual) if p.tipo else None
            tipo_plazo = p.tipo.plazo_meses if p.tipo else None

            ws_prestamos.append([
                str(p.id),
                tipo_nombre,
                tipo_tasa,
                tipo_plazo,
                socio_name,
                socio_doc,
                p.estado,
                float(p.monto),
                float(total_pagado),
                float(saldo),
                float(monto_mora),
                dias_mora,
                cuotas_vencidas,
                p.fecha_desembolso.isoformat(),
                p.fecha_vencimiento.isoformat() if p.fecha_vencimiento else "",
                p.descripcion,
            ])
        style_header_row(ws_prestamos)
        ws_prestamos.freeze_panes = "A2"

        # Hoja de pagos
        ws_pagos = wb.create_sheet("Pagos")
        headers_pagos = ["ID", "Préstamo ID", "Socio", "Monto", "Método", "Fecha", "Referencia"]
        ws_pagos.append(headers_pagos)
        for p in prestamos_qs:
            for pago in p.pagos.all():
                ws_pagos.append([
                  pago.id,
                  str(p.id),
                  p.socio.nombre_completo if p.socio else "",
                  float(pago.monto),
                  pago.metodo,
                  pago.fecha_pago.isoformat(),
                  pago.referencia,
                ])
        style_header_row(ws_pagos)
        ws_pagos.freeze_panes = "A2"

        # Preparar respuesta
        output = io.BytesIO()
        wb.save(output)
        output.seek(0)
        filename_base = "historial_crediticio"
        if socio:
            filename_base = f"historial_{socio.id}"
        filename = f"{filename_base}_{now.strftime('%Y%m%d_%H%M%S')}.xlsx"

        response = HttpResponse(
            output.getvalue(),
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response


class AdminActivityView(APIView):
    permission_classes = [permissions.IsAdminUser]

    @extend_schema(
        tags=['Socios'],
        summary='Actividad reciente del admin',
        description='Últimas acciones del administrador autenticado sobre socios.',
        responses={200: OpenApiResponse(description='Listado de actividad')},
    )
    def get(self, request):
        usuario = request.user
        qs = (
            SocioAuditLog.objects.select_related('socio')
            .filter(performed_by=usuario)
            .order_by('-created_at')[:10]
        )
        data = [
            {
                "socio": log.socio.nombre_completo if log.socio else "",
                "accion": log.get_action_display(),
                "estado_anterior": log.estado_anterior,
                "estado_nuevo": log.estado_nuevo,
                "campos": log.campos_modificados,
                "fecha": log.created_at.isoformat(),
            }
            for log in qs
        ]
        return Response(data)
