import uuid
from decimal import Decimal

from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models
from django.contrib.auth import get_user_model


User = get_user_model()


class Socio(models.Model):
    ESTADO_ACTIVO = 'activo'
    ESTADO_INACTIVO = 'inactivo'
    ESTADO_SUSPENDIDO = 'suspendido'
    ESTADO_CHOICES = (
        (ESTADO_ACTIVO, 'Activo'),
        (ESTADO_INACTIVO, 'Inactivo'),
        (ESTADO_SUSPENDIDO, 'Suspendido'),
    )
    ALLOWED_TRANSITIONS = {
        ESTADO_ACTIVO: {ESTADO_INACTIVO, ESTADO_SUSPENDIDO},
        ESTADO_INACTIVO: {ESTADO_ACTIVO},
        ESTADO_SUSPENDIDO: {ESTADO_ACTIVO},
    }

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    # Relación con usuario (opcional - un socio puede existir sin cuenta de usuario)
    usuario = models.OneToOneField(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='socio',
        db_column='usuario_id'  # Mapea a usuario_id en la BD
    )
    nombre_completo = models.CharField(max_length=150)
    documento = models.CharField(max_length=30, unique=True, null=True, blank=True)
    telefono = models.CharField(max_length=30, null=True, blank=True)
    direccion = models.CharField(max_length=255, null=True, blank=True)
    estado = models.CharField(max_length=15, choices=ESTADO_CHOICES, default=ESTADO_ACTIVO)
    datos_fiscales = models.JSONField(default=dict, blank=True)
    fecha_alta = models.DateField(null=True, blank=True, auto_now_add=False)  # Para compatibilidad con esquema Supabase
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'socio'  # Usa la tabla 'socio' de Supabase
        verbose_name = 'Socio'
        verbose_name_plural = 'Socios'

    def __str__(self) -> str:
        email = self.usuario.email if self.usuario else 'Sin usuario'
        return f"{self.nombre_completo} <{email}>"


class SocioAuditLog(models.Model):
    class Actions(models.TextChoices):
        UPDATE = 'actualizacion', 'Actualizacion'
        STATE_CHANGE = 'cambio_estado', 'Cambio de estado'

    id = models.BigAutoField(primary_key=True)
    socio = models.ForeignKey(Socio, on_delete=models.CASCADE, related_name='auditorias')
    performed_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='socios_modificados')
    action = models.CharField(max_length=32, choices=Actions.choices)
    estado_anterior = models.CharField(max_length=15, choices=Socio.ESTADO_CHOICES, blank=True)
    estado_nuevo = models.CharField(max_length=15, choices=Socio.ESTADO_CHOICES, blank=True)
    campos_modificados = models.JSONField(default=list, blank=True)
    datos_previos = models.JSONField(default=dict, blank=True)
    datos_nuevos = models.JSONField(default=dict, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Auditoría {self.get_action_display()} {self.created_at:%Y-%m-%d %H:%M:%S}"


class TipoPrestamo(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nombre = models.CharField(max_length=80, unique=True)
    descripcion = models.CharField(max_length=255, blank=True)
    tasa_interes_anual = models.DecimalField(max_digits=5, decimal_places=2, validators=[MinValueValidator(0)])
    plazo_meses = models.PositiveSmallIntegerField(validators=[MinValueValidator(1)])
    requisitos = models.JSONField(default=list, blank=True)
    activo = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['nombre']
        db_table = 'tipo_prestamo'
        verbose_name = 'Tipo de prestamo'
        verbose_name_plural = 'Tipos de prestamo'

    def __str__(self) -> str:
        return f"{self.nombre} ({self.tasa_interes_anual}% - {self.plazo_meses}m)"


class PoliticaAprobacion(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nombre = models.CharField(max_length=120, unique=True)
    descripcion = models.CharField(max_length=255, blank=True)
    score_minimo = models.PositiveIntegerField(validators=[MinValueValidator(0), MaxValueValidator(1000)])
    antiguedad_min_meses = models.PositiveSmallIntegerField(validators=[MinValueValidator(0)])
    ratio_cuota_ingreso_max = models.DecimalField(
        max_digits=5,
        decimal_places=3,
        validators=[MinValueValidator(Decimal('0')), MaxValueValidator(Decimal('1'))],
        help_text="Máximo porcentaje de la cuota sobre el ingreso mensual (0-1).",
    )
    activo = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'politica_aprobacion'
        ordering = ['nombre']
        verbose_name = 'Política de aprobación'
        verbose_name_plural = 'Políticas de aprobación'

    def __str__(self) -> str:
        return f"{self.nombre} (score ≥ {self.score_minimo}, antigüedad ≥ {self.antiguedad_min_meses}m)"


class Prestamo(models.Model):
    class Estados(models.TextChoices):
        ACTIVO = 'activo', 'Activo'
        MOROSO = 'moroso', 'Moroso'
        PAGADO = 'pagado', 'Pagado'
        CANCELADO = 'cancelado', 'Cancelado'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    socio = models.ForeignKey(Socio, on_delete=models.CASCADE, related_name='prestamos')
    tipo = models.ForeignKey(TipoPrestamo, on_delete=models.SET_NULL, null=True, blank=True, related_name='prestamos')
    monto = models.DecimalField(max_digits=14, decimal_places=2)
    tasa_interes = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    estado = models.CharField(max_length=15, choices=Estados.choices, default=Estados.ACTIVO)
    fecha_desembolso = models.DateField()
    fecha_vencimiento = models.DateField(null=True, blank=True)
    descripcion = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-fecha_desembolso', '-created_at']
        db_table = 'prestamo'

    def __str__(self) -> str:
        return f"Préstamo {self.id} - {self.get_estado_display()}"

    @property
    def total_pagado(self) -> Decimal:
        total = sum((p.monto for p in self.pagos.all()), Decimal('0'))
        return total

    @property
    def saldo_pendiente(self) -> Decimal:
        saldo = self.monto - self.total_pagado
        return saldo if saldo > Decimal('0') else Decimal('0')


class Pago(models.Model):
    id = models.BigAutoField(primary_key=True)
    prestamo = models.ForeignKey(Prestamo, on_delete=models.CASCADE, related_name='pagos')
    monto = models.DecimalField(max_digits=14, decimal_places=2)
    fecha_pago = models.DateField()
    metodo = models.CharField(max_length=50, blank=True)
    referencia = models.CharField(max_length=50, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-fecha_pago', '-created_at']
        db_table = 'pago'

    def __str__(self) -> str:
        return f"Pago {self.id} - {self.fecha_pago:%Y-%m-%d}"
