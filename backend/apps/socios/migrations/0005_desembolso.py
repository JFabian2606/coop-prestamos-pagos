import django.db.models.deletion
import uuid
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('socios', '0004_politica_aprobacion'),
    ]

    operations = [
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
    ]
