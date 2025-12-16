from django.db import migrations


def drop_legacy_metodo_column(apps, schema_editor):
    connection = schema_editor.connection
    if connection.vendor != "postgresql":
        return

    sql = """
    DO $$
    BEGIN
        IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'desembolso'
              AND column_name = 'metodo'
        ) THEN
            IF NOT EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'desembolso'
                  AND column_name = 'metodo_pago'
            ) THEN
                ALTER TABLE desembolso
                    ADD COLUMN metodo_pago varchar(30);
            END IF;

            UPDATE desembolso
            SET metodo_pago = COALESCE(NULLIF(metodo_pago, ''), NULLIF(metodo, ''), 'transferencia')
            WHERE metodo_pago IS NULL OR metodo_pago = '';

            ALTER TABLE desembolso DROP COLUMN metodo;
            ALTER TABLE desembolso ALTER COLUMN metodo_pago SET NOT NULL;
        END IF;
    END
    $$;
    """

    with connection.cursor() as cursor:
        cursor.execute(sql)


class Migration(migrations.Migration):
    dependencies = [
        ("socios", "0009_ensure_desembolso_created_at_column"),
    ]

    operations = [
        migrations.RunPython(drop_legacy_metodo_column, migrations.RunPython.noop),
    ]
