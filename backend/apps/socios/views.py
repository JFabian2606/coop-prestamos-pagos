from django.shortcuts import get_object_or_404
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
        queryset = Socio.objects.select_related('user').order_by('nombre_completo')
        return Response(SocioSerializer(queryset, many=True).data)


class SocioAdminDetailView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get_object(self, socio_id):
        return get_object_or_404(Socio.objects.select_related('user'), pk=socio_id)

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

