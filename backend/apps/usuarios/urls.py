from django.urls import path

from .views import CustomPasswordResetView, csrf_token, login, logout, registro, usuario_actual

urlpatterns = [
    path('registro/', registro, name='registro'),
    path('login/', login, name='login'),
    path('logout/', logout, name='logout'),
    path('csrf/', csrf_token, name='csrf-token'),
    path('usuario-actual/', usuario_actual, name='usuario-actual'),
    path('password_reset/', CustomPasswordResetView.as_view(), name='password_reset'),
]

