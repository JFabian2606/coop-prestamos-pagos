#!/usr/bin/env python
"""
Script para corregir el orden de migraciones en producción.
Ejecuta las migraciones en el orden correcto.
"""
import os
import sys
import django

# Configurar Django
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.core.management import call_command

if __name__ == '__main__':
    print("Aplicando migraciones en orden correcto...")
    
    # Aplicar migraciones en orden de dependencias
    apps_order = [
        'contenttypes',
        'auth',
        'usuarios',  # Debe ir antes de admin
        'admin',
        'sessions',
        'socios',
    ]
    
    for app in apps_order:
        try:
            print(f"Aplicando migraciones de {app}...")
            call_command('migrate', app, verbosity=1)
        except Exception as e:
            print(f"Error en {app}: {e}")
            # Continuar con las siguientes
    
    # Aplicar todas las migraciones restantes
    print("Aplicando migraciones restantes...")
    call_command('migrate', verbosity=1)
    
    print("Migraciones completadas.")

