from decimal import Decimal

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase, APIClient

from apps.socios.models import TipoPrestamo


User = get_user_model()


class TipoPrestamoAdminTests(APITestCase):
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

    def crear_tipo(self, nombre='Personal', tasa='18.50', plazo=24, activo=True):
        return TipoPrestamo.objects.create(
            nombre=nombre,
            descripcion=f"Tipo {nombre}",
            tasa_interes_anual=Decimal(tasa),
            plazo_meses=plazo,
            requisitos=['Documento', 'Comprobante de ingresos'],
            activo=activo,
        )

    def test_lista_requiere_admin(self):
        self.crear_tipo()
        url = reverse('tipos-prestamo-list')
        self.authenticate(self.no_admin)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        self.authenticate(self.admin)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['nombre'], 'Personal')

    def test_filtra_por_busqueda_y_activo(self):
        self.crear_tipo(nombre='Hipotecario', tasa='9.00', plazo=180, activo=True)
        self.crear_tipo(nombre='Vehicular', tasa='12.00', plazo=60, activo=False)

        self.authenticate(self.admin)
        url = reverse('tipos-prestamo-list')

        response = self.client.get(url, {'q': 'Hipo'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['nombre'], 'Hipotecario')

        response = self.client.get(url, {'soloActivos': 'true'})
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['nombre'], 'Hipotecario')

    def test_crea_actualiza_y_desactiva_tipo(self):
        url = reverse('tipos-prestamo-list')
        payload = {
            'nombre': 'Consumo',
            'descripcion': 'Crédito de consumo flexible',
            'tasa_interes_anual': '15.75',
            'plazo_meses': 36,
            'requisitos': ['Identificación', 'Historial crediticio'],
        }
        self.authenticate(self.admin)
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        tipo_id = response.data['id']
        tipo = TipoPrestamo.objects.get(pk=tipo_id)
        self.assertTrue(tipo.activo)
        self.assertEqual(tipo.plazo_meses, 36)
        self.assertEqual(len(tipo.requisitos), 2)

        detail_url = reverse('tipos-prestamo-detail', kwargs={'tipo_id': tipo_id})
        response = self.client.patch(detail_url, {'plazo_meses': 48}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        tipo.refresh_from_db()
        self.assertEqual(tipo.plazo_meses, 48)

        response = self.client.delete(detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        tipo.refresh_from_db()
        self.assertFalse(tipo.activo)

    def test_valida_requisitos_lista(self):
        url = reverse('tipos-prestamo-list')
        self.authenticate(self.admin)
        response = self.client.post(url, {
            'nombre': 'Invalido',
            'tasa_interes_anual': '10.00',
            'plazo_meses': 12,
            'requisitos': 'Solo texto',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('requisitos', response.data)
