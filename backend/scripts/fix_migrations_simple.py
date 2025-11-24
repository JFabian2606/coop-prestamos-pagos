#!/usr/bin/env python
"""
Script simple para corregir migraciones problemáticas.
Elimina las migraciones de admin, auth, contenttypes, sessions y socios
para que se puedan aplicar en orden correcto.
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
    print("Corrigiendo migraciones...")
    
    try:
        with connection.cursor() as cursor:
            # Verificar si la tabla existe
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'django_migrations'
                );
            """)
            table_exists = cursor.fetchone()[0]
            
            if not table_exists:
                print("✅ Tabla django_migrations no existe. Django la creará automáticamente.")
                sys.exit(0)
            
            # Eliminar migraciones problemáticas
            cursor.execute("""
                DELETE FROM django_migrations 
                WHERE app IN ('admin', 'auth', 'contenttypes', 'sessions', 'socios');
            """)
            deleted = cursor.rowcount
            print(f"✅ Eliminadas {deleted} migraciones problemáticas")
            
    except Exception as e:
        print(f"⚠️ Error: {e}")
        print("Continuando de todas formas...")
        sys.exit(0)

