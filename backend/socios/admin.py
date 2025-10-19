from django.contrib import admin
from .models import Socio


@admin.register(Socio)
class SocioAdmin(admin.ModelAdmin):
    list_display = ("id", "nombre_completo", "documento", "user", "created_at")
    search_fields = ("nombre_completo", "documento", "user__email")

