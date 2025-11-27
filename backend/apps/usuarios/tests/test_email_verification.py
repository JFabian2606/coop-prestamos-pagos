from django.contrib.auth import get_user_model
from django.core import mail
from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase, APIClient

from apps.usuarios.models import Rol


User = get_user_model()


@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class EmailVerificationTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.rol, _ = Rol.objects.get_or_create(nombre='SOCIO')

    def _registrar_usuario(self, email: str = 'nuevo@example.com') -> User:
        payload = {
            'email': email,
            'password': 'secret123',
            'nombres': 'Usuario Prueba',
            'documento': 'DOC-123',
        }
        response = self.client.post(reverse('registro'), payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        return User.objects.get(email=email)

    def _extraer_token(self) -> str:
        self.assertGreaterEqual(len(mail.outbox), 1, 'No se envió correo de verificación')
        body = mail.outbox[-1].body
        marker = 'token='
        for part in body.split():
            if marker in part:
                return part.split(marker, 1)[1].strip()
        self.fail('No se encontró el token en el correo')

    def test_registro_envia_correo_y_deja_usuario_inactivo(self):
        user = self._registrar_usuario()
        self.assertFalse(user.activo)
        self.assertFalse(user.email_verificado)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('token=', mail.outbox[0].body)

    def test_confirmar_email_activa_usuario(self):
        user = self._registrar_usuario('activar@example.com')
        token = self._extraer_token()
        response = self.client.get(reverse('confirmar-email'), {'token': token})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user.refresh_from_db()
        self.assertTrue(user.email_verificado)
        self.assertTrue(user.activo)
        self.assertIsNotNone(user.email_verificado_en)

    def test_login_rechazado_si_no_verificado(self):
        user = self._registrar_usuario('login@example.com')
        response = self.client.post(
            reverse('login'),
            {'email': user.email, 'password': 'secret123'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data['error'], 'Debes confirmar tu email')

    def test_reenviar_verificacion_envia_correo(self):
        user = User.objects.create_user(
            email='reenvio@example.com',
            password='secret123',
            nombres='Reenvio',
            activo=False,
            email_verificado=False,
            rol=self.rol,
        )
        response = self.client.post(reverse('reenviar-verificacion'), {'email': user.email}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)
