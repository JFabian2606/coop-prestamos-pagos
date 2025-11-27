from django.urls import path
from .views import (
    registro,
    login,
    logout,
    usuario_actual,
    csrf_token,
    confirmar_email,
    reenviar_verificacion,
)

urlpatterns = [
    path('registro/', registro, name='registro'),
    path('confirmar-email/', confirmar_email, name='confirmar-email'),
    path('reenviar-verificacion/', reenviar_verificacion, name='reenviar-verificacion'),
    path('login/', login, name='login'),
    path('logout/', logout, name='logout'),
    path('csrf/', csrf_token, name='csrf-token'),
    path('usuario-actual/', usuario_actual, name='usuario-actual'),
]

