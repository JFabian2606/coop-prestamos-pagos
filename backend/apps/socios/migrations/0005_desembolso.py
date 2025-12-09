import django.db.models.deletion
import uuid
from django.db import migrations, models


def create_desembolso_table(apps, schema_editor):
    """
    Create the desembolso table only if it does not exist already.
    This avoids failures on environments where the table was created manually.
    """
    if 'desembolso' in schema_editor.connection.introspection.table_names():
        return

    try:
        Desembolso = apps.get_model('socios', 'Desembolso')
    except LookupError:
        # Fallback to current model definition if it is not yet in the migration state
        from apps.socios.models import Desembolso  # type: ignore
    schema_editor.create_model(Desembolso)


class Migration(migrations.Migration):
    dependencies = [
        ('socios', '0004_politica_aprobacion'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunPython(create_desembolso_table, migrations.RunPython.noop),
            ],
            state_operations=[
                migrations.CreateModel(
                    name='Desembolso',
                    fields=[
                        ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                        ('monto', models.DecimalField(decimal_places=2, max_digits=14)),
                        ('metodo_pago', models.CharField(choices=[('transferencia', 'Transferencia'), ('efectivo', 'Efectivo'), ('cheque', 'Cheque')], max_length=30)),
                        ('referencia', models.CharField(blank=True, max_length=100)),
                        ('comentarios', models.TextField(blank=True, default='')),
                        ('created_at', models.DateTimeField(auto_now_add=True)),
                        ('prestamo', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='desembolsos', to='socios.prestamo')),
                        ('socio', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='desembolsos', to='socios.socio')),
                    ],
                    options={
                        'db_table': 'desembolso',
                        'ordering': ['-created_at'],
                    },
                ),
            ],
        ),
    ]
