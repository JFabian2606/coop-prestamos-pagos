"""
Modelo de Usuario personalizado que usa la tabla 'usuario' de Supabase.
Elimina la redundancia entre auth_user (Django) y usuario (Supabase).
"""
import uuid
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone


class UsuarioManager(BaseUserManager):
    """Manager personalizado para el modelo Usuario"""
    
    def create_user(self, email, password=None, **extra_fields):
        """Crea y guarda un usuario con el email y password dados"""
        if not email:
            raise ValueError('El email es obligatorio')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        if password:
            user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        """Crea y guarda un superusuario"""
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')
        
        return self.create_user(email, password, **extra_fields)


class Rol(models.Model):
    """Modelo de Rol que usa la tabla 'rol' de Supabase"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nombre = models.CharField(max_length=100, unique=True)
    
    class Meta:
        db_table = 'rol'
        verbose_name = 'Rol'
        verbose_name_plural = 'Roles'
    
    def __str__(self):
        return self.nombre


class Usuario(AbstractBaseUser, PermissionsMixin):
    """
    Modelo de usuario personalizado que usa la tabla 'usuario' de Supabase.
    Reemplaza auth_user para eliminar redundancia.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True, db_index=True)
    password_hash = models.CharField(max_length=255, blank=True)  # Para compatibilidad con Supabase
    nombres = models.CharField(max_length=255)
    activo = models.BooleanField(default=True)
    rol = models.ForeignKey(
        Rol,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='usuarios',
        db_column='rol_id'
    )
    created_at = models.DateTimeField(default=timezone.now)
    
    # Campos requeridos por Django
    is_staff = models.BooleanField(default=False)
    is_superuser = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)  # Alias de 'activo' para Django
    
    objects = UsuarioManager()
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['nombres']
    
    class Meta:
        db_table = 'usuario'
        verbose_name = 'Usuario'
        verbose_name_plural = 'Usuarios'
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['rol']),
        ]
    
    def __str__(self):
        return self.email
    
    def get_full_name(self):
        return self.nombres
    
    def get_short_name(self):
        return self.nombres.split()[0] if self.nombres else self.email
    
    def save(self, *args, **kwargs):
        # Sincronizar activo con is_active
        self.is_active = self.activo
        super().save(*args, **kwargs)

