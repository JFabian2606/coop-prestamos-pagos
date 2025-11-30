from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase, APIClient

from apps.socios.models import Socio, SocioAuditLog


User = get_user_model()


class SocioAdminEndpointsTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin', email='admin@example.com', password='secret123', is_staff=True, is_superuser=True
        )
        self.no_admin = User.objects.create_user(
            username='user', email='user@example.com', password='secret123', is_staff=False
        )
        socio_user = User.objects.create_user(username='socio', email='socio@example.com', password='secret123')
        self.socio = Socio.objects.create(
            user=socio_user,
            nombre_completo='Socio Demo',
            documento='DOC-1',
            telefono='555-1111',
            direccion='Calle Falsa 123',
            estado=Socio.ESTADO_ACTIVO,
            datos_fiscales={'ruc': '1234567-8'},
        )
        self.client = APIClient()

    def authenticate(self, user):
        self.client.force_authenticate(user=user)

    def test_list_socios_requires_admin(self):
        self.authenticate(self.no_admin)
        response = self.client.get(reverse('socios-list'))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        self.authenticate(self.admin)
        response = self.client.get(reverse('socios-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['estado'], Socio.ESTADO_ACTIVO)

    def test_put_updates_allowed_fields_and_logs_audit(self):
        self.authenticate(self.admin)
        payload = {
            'nombre_completo': 'Socio Actualizado',
            'documento': 'DOC-999',
            'telefono': '555-9999',
            'direccion': 'Av. Siempre Viva 742',
            'datos_fiscales': {'ruc': '555', 'categoria': 'general'},
        }
        url = reverse('socios-detail', kwargs={'socio_id': str(self.socio.id)})
        response = self.client.put(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.socio.refresh_from_db()
        self.assertEqual(self.socio.nombre_completo, payload['nombre_completo'])
        self.assertEqual(self.socio.estado, Socio.ESTADO_ACTIVO)

        audit = SocioAuditLog.objects.filter(socio=self.socio, action=SocioAuditLog.Actions.UPDATE).first()
        self.assertIsNotNone(audit)
        self.assertIn('nombre_completo', audit.campos_modificados)
        self.assertEqual(audit.performed_by, self.admin)

    def test_put_rejects_estado_changes(self):
        self.authenticate(self.admin)
        payload = {
            'nombre_completo': 'Socio',
            'documento': 'DOC-1',
            'telefono': '555-1111',
            'direccion': 'Calle Falsa 123',
            'datos_fiscales': {},
            'estado': Socio.ESTADO_SUSPENDIDO,
        }
        url = reverse('socios-detail', kwargs={'socio_id': str(self.socio.id)})
        response = self.client.put(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('estado', response.data)

    def test_patch_estado_valid_transition(self):
        self.authenticate(self.admin)
        url = reverse('socios-estado', kwargs={'socio_id': str(self.socio.id)})
        response = self.client.patch(url, {'estado': Socio.ESTADO_SUSPENDIDO}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.socio.refresh_from_db()
        self.assertEqual(self.socio.estado, Socio.ESTADO_SUSPENDIDO)

        audit = SocioAuditLog.objects.filter(socio=self.socio, action=SocioAuditLog.Actions.STATE_CHANGE).first()
        self.assertIsNotNone(audit)
        self.assertEqual(audit.estado_anterior, Socio.ESTADO_ACTIVO)
        self.assertEqual(audit.estado_nuevo, Socio.ESTADO_SUSPENDIDO)

    def test_patch_estado_invalid_transition_rejected(self):
        self.authenticate(self.admin)
        self.socio.estado = Socio.ESTADO_INACTIVO
        self.socio.save(update_fields=['estado'])
        url = reverse('socios-estado', kwargs={'socio_id': str(self.socio.id)})
        response = self.client.patch(url, {'estado': Socio.ESTADO_SUSPENDIDO}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('estado', response.data)

    def test_patch_estado_requires_admin(self):
        self.authenticate(self.no_admin)
        url = reverse('socios-estado', kwargs={'socio_id': str(self.socio.id)})
        response = self.client.patch(url, {'estado': Socio.ESTADO_INACTIVO}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
