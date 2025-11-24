#!/usr/bin/env python
"""
Script para migrar usuarios de auth_user a usuario.
Solo ejecutar si hay datos en auth_user que necesitan migrarse.
"""
import os
import sys
import django

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.db import connection
from apps.usuarios.models import Usuario, Rol

if __name__ == '__main__':
    print("Verificando si hay usuarios en auth_user...")
    
    try:
        with connection.cursor() as cursor:
            # Verificar si existe la tabla auth_user
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'auth_user'
                );
            """)
            auth_user_exists = cursor.fetchone()[0]
            
            if not auth_user_exists:
                print("✅ No existe tabla auth_user. No hay datos que migrar.")
                sys.exit(0)
            
            # Contar usuarios en auth_user
            cursor.execute("SELECT COUNT(*) FROM auth_user;")
            count = cursor.fetchone()[0]
            
            if count == 0:
                print("✅ No hay usuarios en auth_user. No hay datos que migrar.")
                sys.exit(0)
            
            print(f"⚠️ Encontrados {count} usuarios en auth_user.")
            print("⚠️ Estos usuarios necesitan ser migrados manualmente o eliminados.")
            print("\nOpciones:")
            print("1. Eliminar tabla auth_user (si no necesitas esos usuarios)")
            print("2. Migrar usuarios manualmente")
            print("3. Eliminar solo las migraciones y dejar que Django recree todo")
            
    except Exception as e:
        print(f"Error: {e}")

