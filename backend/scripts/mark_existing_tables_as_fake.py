#!/usr/bin/env python
"""
Mark migrations as applied (fake) when the tables already exist.
Prevents "relation already exists" errors on databases that were pre-seeded.
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


def ensure_migrations_table():
    """Create django_migrations if it does not exist (matches Django schema)."""
    with connection.cursor() as cursor:
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS django_migrations (
                id serial PRIMARY KEY,
                app varchar(255) NOT NULL,
                name varchar(255) NOT NULL,
                applied timestamp with time zone NOT NULL
            );
            """
        )
        # Ensure the unique index exists (some preseeded DBs may miss it)
        cursor.execute(
            """
            CREATE UNIQUE INDEX IF NOT EXISTS django_migrations_app_name_idx
                ON django_migrations (app, name);
            """
        )


def mark_migration_as_fake(app: str, migration_name: str) -> bool:
    """Insert into django_migrations if it is not already recorded."""
    with connection.cursor() as cursor:
        cursor.execute(
            """
            INSERT INTO django_migrations (app, name, applied)
            SELECT %s, %s, NOW()
            WHERE NOT EXISTS (
                SELECT 1 FROM django_migrations WHERE app = %s AND name = %s
            );
            """,
            [app, migration_name, app, migration_name],
        )
        return cursor.rowcount > 0


if __name__ == "__main__":
    print("Checking existing tables and marking migrations as fake...")

    if not migrations_table_exists():
        print("django_migrations does not exist; creating it so we can record faked migrations.")
    ensure_migrations_table()

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
        print("OK. Table django_content_type exists - marking migrations as fake")
        mark_migration_as_fake("contenttypes", "0001_initial")
        mark_migration_as_fake("contenttypes", "0002_remove_content_type_name")

    # auth
    if table_exists("auth_user") or table_exists("auth_permission"):
        print("OK. Auth tables exist - marking migrations as fake")
        for name in AUTH_MIGRATIONS:
            mark_migration_as_fake("auth", name)

    # usuarios (custom app)
    if table_exists("rol") or table_exists("usuario"):
        print("OK. rol/usuario tables exist - marking usuarios migration as fake")
        mark_migration_as_fake("usuarios", "0001_initial")

    # admin
    if table_exists("django_admin_log"):
        print("OK. django_admin_log exists - marking admin migrations as fake")
        for name in ADMIN_MIGRATIONS:
            mark_migration_as_fake("admin", name)

    # sessions
    if table_exists("django_session"):
        print("OK. django_session exists - marking sessions migration as fake")
        mark_migration_as_fake("sessions", "0001_initial")

    # socios
    if table_exists("socio"):
        print("OK. socio exists - marking socios migration as fake")
        mark_migration_as_fake("socios", "0001_initial")

    print("OK. Done. Existing tables are now marked as migrated.")
