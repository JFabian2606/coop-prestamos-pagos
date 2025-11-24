from django.urls import path
from .views import registro, login, logout, usuario_actual

urlpatterns = [
    path('registro/', registro, name='registro'),
    path('login/', login, name='login'),
    path('logout/', logout, name='logout'),
    path('usuario-actual/', usuario_actual, name='usuario-actual'),
]

