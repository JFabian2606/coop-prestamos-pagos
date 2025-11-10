from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Socio


User = get_user_model()


class SocioSerializer(serializers.ModelSerializer):
    email = serializers.SerializerMethodField()

    class Meta:
        model = Socio
        fields = (
            'id', 'nombre_completo', 'documento', 'telefono', 'direccion', 'datos_fiscales',
            'estado', 'email', 'created_at', 'updated_at',
        )

    def get_email(self, obj):
        return obj.user.email


class ProfileCreateSerializer(serializers.Serializer):
    nombreCompleto = serializers.CharField(max_length=150)
    documento = serializers.CharField(max_length=30, allow_blank=True, required=False)
    telefono = serializers.CharField(max_length=30, allow_blank=True, required=False)
    direccion = serializers.CharField(max_length=255, allow_blank=True, required=False)
    datosFiscales = serializers.JSONField(required=False)

    def create(self, validated_data):
        user = self.context['request'].user
        socio, _ = Socio.objects.update_or_create(
            user=user,
            defaults={
                'nombre_completo': validated_data['nombreCompleto'],
                'documento': validated_data.get('documento') or None,
                'telefono': validated_data.get('telefono') or None,
                'direccion': validated_data.get('direccion') or None,
                'datos_fiscales': validated_data.get('datosFiscales') or {},
            }
        )
        return socio


class SocioAdminUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Socio
        fields = ('nombre_completo', 'documento', 'telefono', 'direccion', 'datos_fiscales')

    def validate(self, attrs):
        extra = set(self.initial_data.keys()) - set(self.fields.keys())
        if extra:
            errors = {field: ['Campo no editable.'] for field in extra}
            raise serializers.ValidationError(errors)
        return attrs


class SocioEstadoSerializer(serializers.Serializer):
    estado = serializers.ChoiceField(choices=Socio.ESTADO_CHOICES)
    motivo = serializers.CharField(max_length=255, required=False, allow_blank=True)

    def validate(self, attrs):
        socio: Socio = self.context['socio']
        nuevo_estado = attrs['estado']
        estado_actual = socio.estado
        if nuevo_estado == estado_actual:
            raise serializers.ValidationError({'estado': 'El socio ya se encuentra en ese estado.'})

        allowed = Socio.ALLOWED_TRANSITIONS.get(estado_actual, set())
        if nuevo_estado not in allowed:
            raise serializers.ValidationError({
                'estado': f'Transicion de {estado_actual} a {nuevo_estado} no permitida.'
            })
        return attrs

