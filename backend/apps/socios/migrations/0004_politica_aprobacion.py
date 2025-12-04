from decimal import Decimal
from django.db import migrations, models
import uuid
import django.core.validators


class Migration(migrations.Migration):

    dependencies = [
        ('socios', '0003_tipoprestamo_prestamo_tipo'),
    ]

    operations = [
        migrations.CreateModel(
            name='PoliticaAprobacion',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('nombre', models.CharField(max_length=120, unique=True)),
                ('descripcion', models.CharField(blank=True, max_length=255)),
                ('score_minimo', models.PositiveIntegerField(validators=[django.core.validators.MinValueValidator(0), django.core.validators.MaxValueValidator(1000)])),
                ('antiguedad_min_meses', models.PositiveSmallIntegerField(validators=[django.core.validators.MinValueValidator(0)])),
                ('ratio_cuota_ingreso_max', models.DecimalField(decimal_places=3, help_text='Máximo porcentaje de la cuota sobre el ingreso mensual (0-1).', max_digits=5, validators=[django.core.validators.MinValueValidator(Decimal('0')), django.core.validators.MaxValueValidator(Decimal('1'))])),
                ('activo', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Política de aprobación',
                'verbose_name_plural': 'Políticas de aprobación',
                'ordering': ['nombre'],
                'db_table': 'politica_aprobacion',
            },
        ),
    ]
