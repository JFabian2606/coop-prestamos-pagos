from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase, APIClient

from apps.socios.models import Pago, Prestamo, Socio


User = get_user_model()


class HistorialCrediticioTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser(
            email='admin@example.com',
            password='secret123',
            nombres='Admin',
        )
        self.no_admin = User.objects.create_user(
            email='user@example.com',
            password='secret123',
            nombres='Usuario',
            is_staff=False,
        )
        socio_user = User.objects.create_user(
            email='socio@example.com',
            password='secret123',
            nombres='Socio',
        )
        self.socio = Socio.objects.create(
            usuario=socio_user,
            nombre_completo='Socio Demo',
            documento='DOC-1',
            telefono='555-1111',
            direccion='Calle Falsa 123',
            estado=Socio.ESTADO_ACTIVO,
            datos_fiscales={'ruc': '123'},
        )
        self.otro_socio = Socio.objects.create(
            nombre_completo='Otro Socio',
            documento='DOC-2',
            estado=Socio.ESTADO_ACTIVO,
        )
        self.prestamo_activo = Prestamo.objects.create(
            socio=self.socio,
            monto=Decimal('10000'),
            estado=Prestamo.Estados.ACTIVO,
            fecha_desembolso=date(2025, 1, 10),
            fecha_vencimiento=date(2025, 7, 10),
        )
        Pago.objects.create(
            prestamo=self.prestamo_activo,
            monto=Decimal('2500'),
            fecha_pago=date(2025, 1, 25),
            metodo='transferencia',
        )
        Pago.objects.create(
            prestamo=self.prestamo_activo,
            monto=Decimal('2500'),
            fecha_pago=date(2025, 3, 1),
            metodo='transferencia',
        )
        self.prestamo_pagado = Prestamo.objects.create(
            socio=self.socio,
            monto=Decimal('5000'),
            estado=Prestamo.Estados.PAGADO,
            fecha_desembolso=date(2025, 1, 3),
            fecha_vencimiento=date(2025, 4, 3),
        )
        Pago.objects.create(
            prestamo=self.prestamo_pagado,
            monto=Decimal('2000'),
            fecha_pago=date(2025, 1, 5),
            metodo='nequi',
        )
        Pago.objects.create(
            prestamo=self.prestamo_pagado,
            monto=Decimal('3000'),
            fecha_pago=date(2025, 1, 20),
            metodo='nequi',
        )
        self.prestamo_moroso = Prestamo.objects.create(
            socio=self.socio,
            monto=Decimal('7000'),
            estado=Prestamo.Estados.MOROSO,
            fecha_desembolso=date(2025, 3, 2),
            fecha_vencimiento=date(2025, 8, 2),
        )
        Pago.objects.create(
            prestamo=self.prestamo_moroso,
            monto=Decimal('1000'),
            fecha_pago=date(2025, 3, 3),
            metodo='efectivo',
        )
        Prestamo.objects.create(  # para asegurar que no contamina el historial
            socio=self.otro_socio,
            monto=Decimal('9000'),
            estado=Prestamo.Estados.ACTIVO,
            fecha_desembolso=date(2025, 2, 15),
            fecha_vencimiento=date(2025, 8, 15),
        )
        self.client = APIClient()

    def authenticate(self, user):
        self.client.force_authenticate(user=user)

    def test_historial_requiere_admin(self):
        url = reverse('socios-historial', kwargs={'socio_id': str(self.socio.id)})
        self.authenticate(self.no_admin)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_devuelve_prestamos_y_pagos_con_resumen(self):
        url = reverse('socios-historial', kwargs={'socio_id': str(self.socio.id)})
        self.authenticate(self.admin)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        data = response.data
        self.assertIn('prestamos', data)
        self.assertEqual(len(data['prestamos']), 3)  # solo del socio
        estados = {p['estado'] for p in data['prestamos']}
        self.assertIn(Prestamo.Estados.ACTIVO, estados)
        self.assertIn(Prestamo.Estados.PAGADO, estados)
        self.assertIn(Prestamo.Estados.MOROSO, estados)

        pagos_count = sum(len(p['pagos']) for p in data['prestamos'])
        self.assertEqual(pagos_count, 5)

        resumen = data['resumen']
        self.assertEqual(resumen['prestamos_totales'], 3)
        self.assertEqual(resumen['prestamos_pagados'], 1)
        self.assertEqual(resumen['prestamos_morosos'], 1)
        self.assertEqual(resumen['prestamos_activos'], 1)
        self.assertEqual(resumen['pagos_registrados'], 5)
        self.assertEqual(resumen['saldo_pendiente_total'], '11000.00')

    def test_filtra_por_estado_y_fecha(self):
        url = reverse('socios-historial', kwargs={'socio_id': str(self.socio.id)})
        self.authenticate(self.admin)

        response = self.client.get(url, {'estado': Prestamo.Estados.MOROSO})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['prestamos']), 1)
        self.assertEqual(response.data['prestamos'][0]['estado'], Prestamo.Estados.MOROSO)

        response = self.client.get(url, {'desde': '2025-01-01', 'hasta': '2025-01-31'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        prestamos = response.data['prestamos']
        self.assertEqual(len(prestamos), 2)  # activo + pagado (moroso fuera de rango)
        pagos_count = sum(len(p['pagos']) for p in prestamos)
        self.assertEqual(pagos_count, 3)  # solo pagos dentro del rango
        # Metr��icas nuevas presentes
        resumen = response.data['resumen']
        self.assertIn('monto_en_mora_total', resumen)
        self.assertIn('dias_en_mora_max', resumen)
        self.assertIn('dias_en_mora_promedio', resumen)
        self.assertIn('cuotas_vencidas_total', resumen)

    def test_valida_estado_desconocido(self):
        url = reverse('socios-historial', kwargs={'socio_id': str(self.socio.id)})
        self.authenticate(self.admin)
        response = self.client.get(url, {'estado': 'foobar'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('estado', response.data)
