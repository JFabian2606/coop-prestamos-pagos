from decimal import Decimal
import math
from datetime import date

from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Pago, Prestamo, Socio


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
        return obj.usuario.email if obj.usuario else None


class ProfileCreateSerializer(serializers.Serializer):
    nombreCompleto = serializers.CharField(max_length=150)
    documento = serializers.CharField(max_length=30, allow_blank=True, required=False)
    telefono = serializers.CharField(max_length=30, allow_blank=True, required=False)
    direccion = serializers.CharField(max_length=255, allow_blank=True, required=False)
    datosFiscales = serializers.JSONField(required=False)

    def create(self, validated_data):
        usuario = self.context['request'].user
        socio, _ = Socio.objects.update_or_create(
            usuario=usuario,
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


class PagoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Pago
        fields = ('id', 'monto', 'fecha_pago', 'metodo', 'referencia', 'created_at')


class PrestamoSerializer(serializers.ModelSerializer):
    pagos = serializers.SerializerMethodField()
    total_pagado = serializers.SerializerMethodField()
    saldo_pendiente = serializers.SerializerMethodField()
    monto_en_mora = serializers.SerializerMethodField()
    dias_en_mora = serializers.SerializerMethodField()
    cuotas_vencidas = serializers.SerializerMethodField()

    class Meta:
        model = Prestamo
        fields = (
            'id',
            'monto',
            'estado',
            'fecha_desembolso',
            'fecha_vencimiento',
            'descripcion',
            'created_at',
            'updated_at',
            'pagos',
            'total_pagado',
            'saldo_pendiente',
            'monto_en_mora',
            'dias_en_mora',
            'cuotas_vencidas',
        )

    def get_pagos(self, obj: Prestamo):
        pagos = getattr(obj, '_pagos_filtrados', obj.pagos.all())
        return PagoSerializer(pagos, many=True).data

    def _sum_pagos(self, obj: Prestamo) -> Decimal:
        pagos = getattr(obj, '_pagos_filtrados', obj.pagos.all())
        return sum((p.monto for p in pagos), Decimal('0'))

    def get_total_pagado(self, obj: Prestamo) -> str:
        total = self._sum_pagos(obj)
        return f"{total:.2f}"

    def get_saldo_pendiente(self, obj: Prestamo) -> str:
        saldo = obj.monto - self._sum_pagos(obj)
        if saldo < Decimal('0'):
            saldo = Decimal('0')
        return f"{saldo:.2f}"

    def _dias_en_mora(self, obj: Prestamo, saldo: Decimal) -> int:
        if not obj.fecha_vencimiento or saldo <= Decimal('0'):
            return 0
        hoy = date.today()
        if obj.fecha_vencimiento >= hoy:
            return 0
        return (hoy - obj.fecha_vencimiento).days

    def _saldo_pendiente_decimal(self, obj: Prestamo) -> Decimal:
        saldo = obj.monto - self._sum_pagos(obj)
        return saldo if saldo > Decimal('0') else Decimal('0')

    def get_monto_en_mora(self, obj: Prestamo) -> str:
        saldo = self._saldo_pendiente_decimal(obj)
        dias = self._dias_en_mora(obj, saldo)
        monto = saldo if dias > 0 else Decimal('0')
        return f"{monto:.2f}"

    def get_dias_en_mora(self, obj: Prestamo) -> int:
        saldo = self._saldo_pendiente_decimal(obj)
        return self._dias_en_mora(obj, saldo)

    def get_cuotas_vencidas(self, obj: Prestamo) -> int:
        saldo = self._saldo_pendiente_decimal(obj)
        dias = self._dias_en_mora(obj, saldo)
        if dias <= 0:
            return 0
        return max(1, math.ceil(dias / 30))


class HistorialCrediticioSerializer(serializers.Serializer):
    socio = SocioSerializer(allow_null=True)
    prestamos = PrestamoSerializer(many=True)
    resumen = serializers.SerializerMethodField()

    def get_resumen(self, data):
        prestamos = data.get('prestamos') or []
        pagos_mostrados = 0
        saldo_pendiente_total = Decimal('0')
        monto_en_mora_total = Decimal('0')
        dias_mora_list: list[int] = []
        cuotas_vencidas_total = 0
        abiertos = morosos = pagados = 0

        for prestamo in prestamos:
            pagos_filtrados = getattr(prestamo, '_pagos_filtrados', prestamo.pagos.all())
            pagos_mostrados += len(pagos_filtrados)
            total_pagado = sum((p.monto for p in prestamo.pagos.all()), Decimal('0'))
            saldo = prestamo.monto - total_pagado
            saldo = saldo if saldo > Decimal('0') else Decimal('0')
            saldo_pendiente_total += saldo

            if prestamo.estado == Prestamo.Estados.MOROSO:
                morosos += 1
            elif prestamo.estado == Prestamo.Estados.PAGADO:
                pagados += 1
            else:
                abiertos += 1

            # Métricas de mora por fechas
            if prestamo.fecha_vencimiento and saldo > Decimal('0'):
                hoy = date.today()
                if prestamo.fecha_vencimiento < hoy:
                    dias_mora = (hoy - prestamo.fecha_vencimiento).days
                    dias_mora_list.append(dias_mora)
                    cuotas_vencidas_total += max(1, math.ceil(dias_mora / 30))
                    monto_en_mora_total += saldo

        dias_en_mora_max = max(dias_mora_list) if dias_mora_list else 0
        dias_en_mora_promedio = sum(dias_mora_list) / len(dias_mora_list) if dias_mora_list else 0
        return {
            'prestamos_totales': len(prestamos),
            'prestamos_activos': abiertos,
            'prestamos_morosos': morosos,
            'prestamos_pagados': pagados,
            'pagos_registrados': pagos_mostrados,
            'saldo_pendiente_total': f"{saldo_pendiente_total:.2f}",
            'monto_en_mora_total': f"{monto_en_mora_total:.2f}",
            'dias_en_mora_max': dias_en_mora_max,
            'dias_en_mora_promedio': round(dias_en_mora_promedio, 2) if dias_mora_list else 0,
            'cuotas_vencidas_total': cuotas_vencidas_total,
            'prestamos_en_mora': len(dias_mora_list),
        }
