from django.urls import path
from .views import (
    MeView,
    ProfileUpsertView,
    SocioHistorialView,
    SocioHistorialExportView,
    AdminActivityView,
    SocioAdminDetailView,
    SocioExportView,
    SocioEstadoUpdateView,
    SocioListView,
)

urlpatterns = [
    path('auth/me', MeView.as_view(), name='auth-me'),
    path('socios/profile', ProfileUpsertView.as_view(), name='socios-profile'),
    path('socios', SocioListView.as_view(), name='socios-list'),
    path('socios/<uuid:socio_id>/', SocioAdminDetailView.as_view(), name='socios-detail'),
    path('socios/<uuid:socio_id>/estado/', SocioEstadoUpdateView.as_view(), name='socios-estado'),
    path('socios/historial/', SocioHistorialView.as_view(), name='socios-historial-global'),
    path('socios/<uuid:socio_id>/historial/', SocioHistorialView.as_view(), name='socios-historial'),
    path('socios/historial/export/', SocioHistorialExportView.as_view(), name='socios-historial-export-global'),
    path('socios/<uuid:socio_id>/historial/export/', SocioHistorialExportView.as_view(), name='socios-historial-export'),
    path('socios/actividad-admin/', AdminActivityView.as_view(), name='socios-actividad-admin'),
    path('socios/export/', SocioExportView.as_view(), name='socios-export'),
]
