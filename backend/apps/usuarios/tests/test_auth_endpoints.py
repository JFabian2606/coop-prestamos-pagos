from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase, APIClient

from apps.socios.models import Socio
from apps.usuarios.models import Rol


User = get_user_model()


class AuthEndpointsTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.rol_socio, _ = Rol.objects.get_or_create(nombre='SOCIO')

    def test_registro_crea_usuario_y_socio(self):
        payload = {
            'email': 'nuevo@example.com',
            'password': 'secreto123',
            'nombres': 'Nuevo Usuario',
            'documento': 'DOC-123',
        }
        response = self.client.post(reverse('registro'), payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(User.objects.count(), 1)
        self.assertEqual(Socio.objects.count(), 1)
        socio = Socio.objects.get()
        self.assertEqual(socio.usuario.email, payload['email'])
        self.assertEqual(socio.estado, Socio.ESTADO_ACTIVO)

    def test_registro_requiere_campos_obligatorios(self):
        response = self.client.post(reverse('registro'), {'email': 'falta@ejemplo.com'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_login_exitoso_devuelve_sesion(self):
        user = User.objects.create_user(
            email='login@example.com',
            password='clave-123',
            nombres='Login User',
            rol=self.rol_socio,
        )
        response = self.client.post(reverse('login'), {'email': user.email, 'password': 'clave-123'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('usuario', response.data)
        self.assertTrue(response.data.get('session_id'))

    def test_login_rechaza_usuario_inactivo(self):
        user = User.objects.create_user(
            email='inactivo@example.com',
            password='clave-123',
            nombres='Inactivo',
            rol=self.rol_socio,
            activo=False,
        )
        response = self.client.post(reverse('login'), {'email': user.email, 'password': 'clave-123'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('error', response.data)

    def test_usuario_actual_requiere_autenticacion(self):
        response = self.client.get(reverse('usuario-actual'))
        # SessionAuthentication retorna 403 cuando no hay sesion o CSRF
        self.assertIn(response.status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))

    def test_usuario_actual_retorna_datos(self):
        user = User.objects.create_user(
            email='autenticado@example.com',
            password='clave-123',
            nombres='Autenticado',
            rol=self.rol_socio,
        )
        self.client.force_authenticate(user=user)
        response = self.client.get(reverse('usuario-actual'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], user.email)
        self.assertTrue(response.data['activo'])

    def test_logout_cierra_sesion(self):
        user = User.objects.create_user(
            email='logout@example.com',
            password='clave-123',
            nombres='Logout',
            rol=self.rol_socio,
        )
        # Autenticar via endpoint para generar session_id
        login_resp = self.client.post(reverse('login'), {'email': user.email, 'password': 'clave-123'}, format='json')
        self.assertEqual(login_resp.status_code, status.HTTP_200_OK)

        logout_resp = self.client.post(reverse('logout'))
        self.assertEqual(logout_resp.status_code, status.HTTP_200_OK)
        self.assertIn('message', logout_resp.data)

    def test_csrf_token_devuelve_cookie(self):
        response = self.client.get(reverse('csrf-token'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('csrftoken', response.cookies)
