#!/usr/bin/env python
"""
Script para resetear migraciones en producción.
Marca todas las migraciones como no aplicadas y luego las aplica en orden correcto.
"""
import os
import sys
import django

# Configurar Django
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.db import connection

if __name__ == '__main__':
    print("Reseteando migraciones...")
    
    with connection.cursor() as cursor:
        # Eliminar todas las migraciones aplicadas
        cursor.execute("TRUNCATE TABLE django_migrations;")
        print("✅ Migraciones eliminadas de django_migrations")
    
    print("Ahora ejecuta: python manage.py migrate --fake-initial")
    print("O simplemente: python manage.py migrate")

