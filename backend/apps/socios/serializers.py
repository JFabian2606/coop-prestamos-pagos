from decimal import Decimal
import math
from datetime import date

from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Pago, Prestamo, Socio, TipoPrestamo, PoliticaAprobacion


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


class TipoPrestamoSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoPrestamo
        fields = (
            'id',
            'nombre',
            'descripcion',
            'tasa_interes_anual',
            'plazo_meses',
            'requisitos',
            'activo',
            'created_at',
            'updated_at',
        )


class TipoPrestamoUpsertSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoPrestamo
        fields = ('nombre', 'descripcion', 'tasa_interes_anual', 'plazo_meses', 'requisitos', 'activo')
        extra_kwargs = {'activo': {'required': False}}

    def validate_requisitos(self, value):
        if value is None:
            return []
        if not isinstance(value, (list, tuple)):
            raise serializers.ValidationError('Debe ser una lista de requisitos.')
        requisitos_limpios: list[str] = []
        for req in value:
            if not isinstance(req, str):
                raise serializers.ValidationError('Cada requisito debe ser texto.')
            texto = req.strip()
            if texto:
                requisitos_limpios.append(texto)
        return requisitos_limpios

    def validate_plazo_meses(self, value):
        if value is None or value < 1:
            raise serializers.ValidationError('El plazo en meses debe ser mayor o igual a 1.')
        return value


class PoliticaAprobacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PoliticaAprobacion
        fields = (
            'id',
            'nombre',
            'descripcion',
            'score_minimo',
            'antiguedad_min_meses',
            'ratio_cuota_ingreso_max',
            'activo',
            'created_at',
            'updated_at',
        )


class PoliticaAprobacionUpsertSerializer(serializers.ModelSerializer):
    class Meta:
        model = PoliticaAprobacion
        fields = (
            'nombre',
            'descripcion',
            'score_minimo',
            'antiguedad_min_meses',
            'ratio_cuota_ingreso_max',
            'activo',
        )
        extra_kwargs = {'activo': {'required': False}}

    def validate_ratio_cuota_ingreso_max(self, value: Decimal):
        if value is None:
            raise serializers.ValidationError('Este valor es obligatorio.')
        if value < 0 or value > 1:
            raise serializers.ValidationError('Debe estar entre 0 y 1 (ej: 0.35 representa 35%).')
        return value

    def validate_score_minimo(self, value: int):
        if value is None or value < 0 or value > 1000:
            raise serializers.ValidationError('El score debe estar entre 0 y 1000.')
        return value

    def validate_antiguedad_min_meses(self, value: int):
        if value is None or value < 0:
            raise serializers.ValidationError('La antigüedad mínima no puede ser negativa.')
        return value

    def validate_tasa_interes_anual(self, value):
        if value is None or value < 0:
            raise serializers.ValidationError('La tasa de interes anual no puede ser negativa.')
        return value


class PrestamoSerializer(serializers.ModelSerializer):
    pagos = serializers.SerializerMethodField()
    total_pagado = serializers.SerializerMethodField()
    saldo_pendiente = serializers.SerializerMethodField()
    monto_en_mora = serializers.SerializerMethodField()
    dias_en_mora = serializers.SerializerMethodField()
    cuotas_vencidas = serializers.SerializerMethodField()
    socio_nombre = serializers.SerializerMethodField()
    socio_documento = serializers.SerializerMethodField()
    tipo = serializers.SerializerMethodField()

    class Meta:
        model = Prestamo
        fields = (
            'id',
            'monto',
            'estado',
            'fecha_desembolso',
            'fecha_vencimiento',
            'descripcion',
            'tipo',
            'created_at',
            'updated_at',
            'pagos',
            'total_pagado',
            'saldo_pendiente',
            'monto_en_mora',
            'dias_en_mora',
            'cuotas_vencidas',
            'socio_nombre',
            'socio_documento',
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

    def get_socio_nombre(self, obj: Prestamo) -> str:
        return obj.socio.nombre_completo if obj.socio else ""

    def get_socio_documento(self, obj: Prestamo) -> str:
        return obj.socio.documento if obj.socio else ""

    def get_tipo(self, obj: Prestamo):
        if not obj.tipo:
            return None
        return {
            'id': str(obj.tipo.id),
            'nombre': obj.tipo.nombre,
            'tasa_interes_anual': f"{obj.tipo.tasa_interes_anual:.2f}",
            'plazo_meses': obj.tipo.plazo_meses,
        }


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


class PrestamoSimulacionSerializer(serializers.Serializer):
    tipo_prestamo_id = serializers.UUIDField()
    monto = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=Decimal('0.01'))
    plazo_meses = serializers.IntegerField(required=False, min_value=1)


class PrestamoSolicitudSerializer(PrestamoSimulacionSerializer):
    descripcion = serializers.CharField(max_length=255, allow_blank=True, required=False)
