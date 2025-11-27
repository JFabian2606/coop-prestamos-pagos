from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import Usuario, Rol


@admin.register(Rol)
class RolAdmin(admin.ModelAdmin):
    list_display = ('nombre',)
    search_fields = ('nombre',)


@admin.register(Usuario)
class UsuarioAdmin(BaseUserAdmin):
    """Admin personalizado para Usuario"""
    list_display = ('email', 'nombres', 'rol', 'activo', 'email_verificado', 'is_staff', 'created_at')
    list_filter = ('activo', 'email_verificado', 'is_staff', 'is_superuser', 'rol', 'created_at')
    search_fields = ('email', 'nombres')
    ordering = ('email',)
    
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Información Personal', {'fields': ('nombres',)}),
        ('Estado de cuenta', {'fields': ('activo', 'email_verificado', 'email_verificado_en')}),
        ('Permisos', {'fields': ('is_staff', 'is_superuser', 'rol', 'groups', 'user_permissions')}),
        ('Fechas', {'fields': ('last_login', 'created_at')}),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'nombres', 'password1', 'password2', 'rol', 'activo', 'is_staff'),
        }),
    )
    
    readonly_fields = ('created_at', 'last_login', 'email_verificado_en')

