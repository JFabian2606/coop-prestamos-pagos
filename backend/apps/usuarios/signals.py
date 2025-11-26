"""
Signals para crear automáticamente un Socio cuando se registra un Usuario
con rol SOCIO.
"""
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from apps.socios.models import Socio

User = get_user_model()


@receiver(post_save, sender=User)
def crear_socio_automatico(sender, instance, created, **kwargs):
    """
    Crea automáticamente un Socio cuando se registra un Usuario con rol SOCIO.
    
    Solo se ejecuta cuando:
    - Se crea un nuevo usuario (created=True)
    - El usuario tiene rol SOCIO
    - El usuario no tiene socio asociado
    """
    if not created:
        return
    
    # Solo crear socio si el usuario tiene rol SOCIO
    if instance.rol and instance.rol.nombre == 'SOCIO':
        # Verificar que no tenga socio ya asociado
        try:
            instance.socio
        except Socio.DoesNotExist:
            # Crear socio con datos básicos del usuario
            from datetime import date
            Socio.objects.create(
                usuario=instance,
                nombre_completo=instance.nombres,  # Usar nombre_completo del modelo Socio
                documento=getattr(instance, "email", None) or str(instance.id),
                estado=Socio.ESTADO_ACTIVO,
                fecha_alta=date.today(),  # Fecha actual como default
            )
