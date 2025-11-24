#!/usr/bin/env python
"""
Script para marcar migraciones como fake si las tablas ya existen.
Esto evita errores de "relation already exists".
"""
import os
import sys
import django
from django.db import connection

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

def table_exists(table_name):
    """Verifica si una tabla existe"""
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = %s
            );
        """, [table_name])
        return cursor.fetchone()[0]

def mark_migration_as_fake(app, migration_name):
    """Marca una migración como aplicada (fake)"""
    with connection.cursor() as cursor:
        cursor.execute("""
            INSERT INTO django_migrations (app, name, applied)
            VALUES (%s, %s, NOW())
            ON CONFLICT (app, name) DO NOTHING;
        """, [app, migration_name])
        return cursor.rowcount > 0

if __name__ == '__main__':
    print("Verificando tablas existentes y marcando migraciones como fake...")
    
    # Verificar y marcar migraciones de contenttypes
    if table_exists('django_content_type'):
        print("✅ Tabla django_content_type existe - marcando migraciones como fake")
        mark_migration_as_fake('contenttypes', '0001_initial')
        mark_migration_as_fake('contenttypes', '0002_remove_content_type_name')
    
    # Verificar y marcar migraciones de auth
    if table_exists('auth_user') or table_exists('auth_permission'):
        print("✅ Tablas de auth existen - marcando migraciones como fake")
        for i in range(1, 13):
            mark_migration_as_fake('auth', f'000{i}_initial' if i < 10 else f'00{i}_initial')
    
    # Verificar y marcar migraciones de usuarios
    if table_exists('rol') or table_exists('usuario'):
        print("✅ Tablas rol/usuario existen - marcando migración de usuarios como fake")
        mark_migration_as_fake('usuarios', '0001_initial')
    
    # Verificar y marcar migraciones de admin
    if table_exists('django_admin_log'):
        print("✅ Tabla django_admin_log existe - marcando migración de admin como fake")
        mark_migration_as_fake('admin', '0001_initial')
    
    # Verificar y marcar migraciones de sessions
    if table_exists('django_session'):
        print("✅ Tabla django_session existe - marcando migración de sessions como fake")
        mark_migration_as_fake('sessions', '0001_initial')
    
    # Verificar y marcar migraciones de socios
    if table_exists('socio'):
        print("✅ Tabla socio existe - marcando migración de socios como fake")
        mark_migration_as_fake('socios', '0001_initial')
    
    print("✅ Proceso completado. Las tablas existentes están marcadas como migradas.")

