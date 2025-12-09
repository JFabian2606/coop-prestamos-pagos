from django.db import migrations


SQL = """
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'desembolso'
          AND column_name = 'created_at'
    ) THEN
        ALTER TABLE desembolso
            ADD COLUMN created_at timestamp with time zone DEFAULT NOW();
    END IF;
END
$$;
"""


class Migration(migrations.Migration):
    dependencies = [
        ("socios", "0008_ensure_desembolso_comentarios_column"),
    ]

    operations = [
        migrations.RunSQL(SQL, reverse_sql=migrations.RunSQL.noop),
    ]
