from django.contrib import admin
from .models import Pago, Prestamo, Socio, SocioAuditLog, TipoPrestamo, PoliticaAprobacion


@admin.register(Socio)
class SocioAdmin(admin.ModelAdmin):
    list_display = ("id", "nombre_completo", "documento", "estado", "usuario", "updated_at")
    search_fields = ("nombre_completo", "documento", "usuario__email")
    list_filter = ("estado",)


@admin.register(SocioAuditLog)
class SocioAuditLogAdmin(admin.ModelAdmin):
    list_display = ("id", "socio", "action", "estado_anterior", "estado_nuevo", "performed_by", "created_at")
    search_fields = ("socio__nombre_completo", "socio__documento", "performed_by__email")
    list_filter = ("action", "estado_nuevo")


@admin.register(Prestamo)
class PrestamoAdmin(admin.ModelAdmin):
    list_display = ("id", "socio", "tipo", "monto", "estado", "fecha_desembolso", "fecha_vencimiento", "updated_at")
    search_fields = ("id", "socio__nombre_completo", "socio__documento", "tipo__nombre")
    list_filter = ("estado", "tipo")


@admin.register(TipoPrestamo)
class TipoPrestamoAdmin(admin.ModelAdmin):
    list_display = ("id", "nombre", "tasa_interes_anual", "plazo_meses", "activo", "updated_at")
    search_fields = ("nombre", "descripcion")
    list_filter = ("activo",)


@admin.register(PoliticaAprobacion)
class PoliticaAprobacionAdmin(admin.ModelAdmin):
    list_display = ("id", "nombre", "score_minimo", "antiguedad_min_meses", "ratio_cuota_ingreso_max", "activo", "updated_at")
    search_fields = ("nombre", "descripcion")
    list_filter = ("activo",)


@admin.register(Pago)
class PagoAdmin(admin.ModelAdmin):
    list_display = ("id", "prestamo", "monto", "fecha_pago", "metodo", "referencia")
    search_fields = ("prestamo__id", "prestamo__socio__nombre_completo")
    list_filter = ("metodo",)
