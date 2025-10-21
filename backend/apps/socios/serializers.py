from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Socio


User = get_user_model()


class SocioSerializer(serializers.ModelSerializer):
    email = serializers.SerializerMethodField()

    class Meta:
        model = Socio
        fields = (
            'id', 'nombre_completo', 'documento', 'telefono', 'direccion', 'email',
            'created_at', 'updated_at',
        )

    def get_email(self, obj):
        return obj.user.email


class ProfileCreateSerializer(serializers.Serializer):
    nombreCompleto = serializers.CharField(max_length=150)
    documento = serializers.CharField(max_length=30, allow_blank=True, required=False)
    telefono = serializers.CharField(max_length=30, allow_blank=True, required=False)
    direccion = serializers.CharField(max_length=255, allow_blank=True, required=False)

    def create(self, validated_data):
        user = self.context['request'].user
        socio, _ = Socio.objects.update_or_create(
            user=user,
            defaults={
                'nombre_completo': validated_data['nombreCompleto'],
                'documento': validated_data.get('documento') or None,
                'telefono': validated_data.get('telefono') or None,
                'direccion': validated_data.get('direccion') or None,
            }
        )
        return socio

