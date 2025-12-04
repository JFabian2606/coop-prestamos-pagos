from decimal import Decimal

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase, APIClient

from apps.socios.models import PoliticaAprobacion


User = get_user_model()


class PoliticaAprobacionTests(APITestCase):
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
        self.client = APIClient()

    def authenticate(self, user):
        self.client.force_authenticate(user=user)

    def crear_politica(self, nombre='Default', score=600, meses=12, ratio=Decimal('0.35'), activa=True):
        return PoliticaAprobacion.objects.create(
            nombre=nombre,
            descripcion=f"Politica {nombre}",
            score_minimo=score,
            antiguedad_min_meses=meses,
            ratio_cuota_ingreso_max=ratio,
            activo=activa,
        )

    def test_lista_requiere_admin(self):
        self.crear_politica(nombre='Auto 1')
        url = reverse('politicas-aprobacion-list')

        self.authenticate(self.no_admin)
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

        self.authenticate(self.admin)
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data), 1)
        self.assertEqual(resp.data[0]['nombre'], 'Auto 1')

    def test_crea_actualiza_y_desactiva(self):
        url = reverse('politicas-aprobacion-list')
        payload = {
            'nombre': 'Automatica A',
            'descripcion': 'Aprobacion para scores altos',
            'score_minimo': 700,
            'antiguedad_min_meses': 6,
            'ratio_cuota_ingreso_max': '0.30',
        }
        self.authenticate(self.admin)
        resp = self.client.post(url, payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        politica_id = resp.data['id']
        politica = PoliticaAprobacion.objects.get(pk=politica_id)
        self.assertTrue(politica.activo)
        self.assertEqual(politica.score_minimo, 700)

        detail = reverse('politicas-aprobacion-detail', kwargs={'politica_id': politica_id})
        resp = self.client.patch(detail, {'antiguedad_min_meses': 12}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        politica.refresh_from_db()
        self.assertEqual(politica.antiguedad_min_meses, 12)

        resp = self.client.delete(detail)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        politica.refresh_from_db()
        self.assertFalse(politica.activo)

    def test_filtra_activas(self):
        self.crear_politica(nombre='Activa', activa=True)
        self.crear_politica(nombre='Inactiva', activa=False)
        url = reverse('politicas-aprobacion-list')

        self.authenticate(self.admin)
        resp = self.client.get(url, {'soloActivos': 'true'})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data), 1)
        self.assertEqual(resp.data[0]['nombre'], 'Activa')

    def test_valida_campos(self):
        url = reverse('politicas-aprobacion-list')
        self.authenticate(self.admin)
        resp = self.client.post(url, {
            'nombre': 'Invalida',
            'score_minimo': 1200,
            'antiguedad_min_meses': -1,
            'ratio_cuota_ingreso_max': '1.5',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('score_minimo', resp.data)
        self.assertIn('antiguedad_min_meses', resp.data)
        self.assertIn('ratio_cuota_ingreso_max', resp.data)
