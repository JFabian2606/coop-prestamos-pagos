from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("socios", "0005_desembolso"),
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
                        AND column_name = 'metodo_pago'
                ) THEN
                    ALTER TABLE desembolso
                        ADD COLUMN metodo_pago varchar(30) NOT NULL DEFAULT 'transferencia';
                    ALTER TABLE desembolso
                        ALTER COLUMN metodo_pago DROP DEFAULT;
                END IF;
            END
            $$;
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
