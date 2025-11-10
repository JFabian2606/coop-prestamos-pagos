import uuid
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
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='socio')
    nombre_completo = models.CharField(max_length=150)
    documento = models.CharField(max_length=30, unique=True, null=True, blank=True)
    telefono = models.CharField(max_length=30, null=True, blank=True)
    direccion = models.CharField(max_length=255, null=True, blank=True)
    estado = models.CharField(max_length=15, choices=ESTADO_CHOICES, default=ESTADO_ACTIVO)
    datos_fiscales = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"{self.nombre_completo} <{self.user.email}>"


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

