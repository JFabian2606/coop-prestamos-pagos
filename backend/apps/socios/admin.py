from django.contrib import admin
from .models import Socio, SocioAuditLog


@admin.register(Socio)
class SocioAdmin(admin.ModelAdmin):
    list_display = ("id", "nombre_completo", "documento", "estado", "user", "updated_at")
    search_fields = ("nombre_completo", "documento", "user__email")
    list_filter = ("estado",)


@admin.register(SocioAuditLog)
class SocioAuditLogAdmin(admin.ModelAdmin):
    list_display = ("id", "socio", "action", "estado_anterior", "estado_nuevo", "performed_by", "created_at")
    search_fields = ("socio__nombre_completo", "socio__documento", "performed_by__email")
    list_filter = ("action", "estado_nuevo")
