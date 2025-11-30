from django.urls import path
from .views import registro, login, logout, usuario_actual, csrf_token

urlpatterns = [
    path('registro/', registro, name='registro'),
    path('login/', login, name='login'),
    path('logout/', logout, name='logout'),
    path('csrf/', csrf_token, name='csrf-token'),
    path('usuario-actual/', usuario_actual, name='usuario-actual'),
]

