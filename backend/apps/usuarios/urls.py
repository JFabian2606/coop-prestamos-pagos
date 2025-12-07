from django.urls import path
from .views import (
    registro,
    login,
    logout,
    usuario_actual,
    csrf_token,
    RolesListView,
    UsuariosListView,
    UsuarioRoleUpdateView,
)

urlpatterns = [
    path('registro/', registro, name='registro'),
    path('login/', login, name='login'),
    path('logout/', logout, name='logout'),
    path('csrf/', csrf_token, name='csrf-token'),
    path('usuario-actual/', usuario_actual, name='usuario-actual'),
    path('roles/', RolesListView.as_view(), name='roles-list'),
    path('usuarios/', UsuariosListView.as_view(), name='usuarios-list'),
    path('usuarios/<uuid:usuario_id>/rol/', UsuarioRoleUpdateView.as_view(), name='usuarios-role-update'),
]

