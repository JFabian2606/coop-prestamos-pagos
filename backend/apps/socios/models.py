import uuid
from django.db import models
from django.contrib.auth import get_user_model


User = get_user_model()


class Socio(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='socio')
    nombre_completo = models.CharField(max_length=150)
    documento = models.CharField(max_length=30, unique=True, null=True, blank=True)
    telefono = models.CharField(max_length=30, null=True, blank=True)
    direccion = models.CharField(max_length=255, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"{self.nombre_completo} <{self.user.email}>"

