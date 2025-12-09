from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("socios", "0006_add_metodo_pago_column"),
    ]

    operations = [
        migrations.RunSQL(
            """
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_name = 'desembolso'
                        AND column_name = 'comentarios'
                ) THEN
                    ALTER TABLE desembolso
                        ADD COLUMN comentarios text NOT NULL DEFAULT '';
                    ALTER TABLE desembolso
                        ALTER COLUMN comentarios DROP DEFAULT;
                END IF;
            END
            $$;
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
