from django.urls import path
from .views import (
    MeView,
    ProfileUpsertView,
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
    path('socios/export/', SocioExportView.as_view(), name='socios-export'),
]
