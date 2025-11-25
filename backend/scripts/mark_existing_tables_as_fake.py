#!/usr/bin/env python
"""
Marca migraciones como aplicadas (fake) si las tablas ya existen.
Evita errores de "relation already exists" en despliegues sobre una base con tablas precargadas.
"""
import os
import sys

import django
from django.db import connection


sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()


def table_exists(table_name: str) -> bool:
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_schema = 'public'
                  AND table_name = %s
            );
            """,
            [table_name],
        )
        return cursor.fetchone()[0]


def migrations_table_exists() -> bool:
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_schema = 'public'
                  AND table_name = 'django_migrations'
            );
            """
        )
        return cursor.fetchone()[0]


def mark_migration_as_fake(app: str, migration_name: str) -> bool:
    """Inserta en django_migrations si no existe ya."""
    with connection.cursor() as cursor:
        cursor.execute(
            """
            INSERT INTO django_migrations (app, name, applied)
            VALUES (%s, %s, NOW())
            ON CONFLICT (app, name) DO NOTHING;
            """,
            [app, migration_name],
        )
        return cursor.rowcount > 0


if __name__ == "__main__":
    print("Verificando tablas existentes y marcando migraciones como fake...")

    if not migrations_table_exists():
        print("Tabla django_migrations no existe aún; Django la creará en la primera migración.")
        sys.exit(0)

    AUTH_MIGRATIONS = [
        "0001_initial",
        "0002_alter_permission_name_max_length",
        "0003_alter_user_email_max_length",
        "0004_alter_user_username_opts",
        "0005_alter_user_last_login_null",
        "0006_require_contenttypes_0002",
        "0007_alter_validators_add_error_messages",
        "0008_alter_user_username_max_length",
        "0009_alter_user_last_name_max_length",
        "0010_alter_group_name_max_length",
        "0011_update_proxy_permissions",
        "0012_alter_user_first_name_max_length",
    ]

    ADMIN_MIGRATIONS = [
        "0001_initial",
        "0002_logentry_remove_auto_add",
        "0003_logentry_add_action_flag_choices",
        "0004_alter_logentry_content_type",
    ]

    # contenttypes
    if table_exists("django_content_type"):
        print("OK. Tabla django_content_type existe - marcando migraciones como fake")
        mark_migration_as_fake("contenttypes", "0001_initial")
        mark_migration_as_fake("contenttypes", "0002_remove_content_type_name")

    # auth
    if table_exists("auth_user") or table_exists("auth_permission"):
        print("OK. Tablas de auth existen - marcando migraciones como fake")
        for name in AUTH_MIGRATIONS:
            mark_migration_as_fake("auth", name)

    # usuarios (custom app)
    if table_exists("rol") or table_exists("usuario"):
        print("OK. Tablas rol/usuario existen - marcando migración de usuarios como fake")
        mark_migration_as_fake("usuarios", "0001_initial")

    # admin
    if table_exists("django_admin_log"):
        print("OK. Tabla django_admin_log existe - marcando migraciones de admin como fake")
        for name in ADMIN_MIGRATIONS:
            mark_migration_as_fake("admin", name)

    # sessions
    if table_exists("django_session"):
        print("OK. Tabla django_session existe - marcando migración de sessions como fake")
        mark_migration_as_fake("sessions", "0001_initial")

    # socios
    if table_exists("socio"):
        print("OK. Tabla socio existe - marcando migración de socios como fake")
        mark_migration_as_fake("socios", "0001_initial")

    print("OK. Proceso completado. Las tablas existentes están marcadas como migradas.")
