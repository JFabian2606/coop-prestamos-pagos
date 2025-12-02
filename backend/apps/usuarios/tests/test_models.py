from django.core.exceptions import ValidationError
from django.test import TestCase

from apps.usuarios.models import Usuario, UsuarioManager


class UsuarioManagerTests(TestCase):
    def test_create_user_requiere_email(self):
        manager = UsuarioManager()
        with self.assertRaises(ValueError):
            manager.create_user(email=None, password='x', nombres='Sin Email')

    def test_create_user_normaliza_email(self):
        user = Usuario.objects.create_user(email='MAYUS@example.COM', password='x', nombres='Mayus')
        self.assertEqual(user.email, 'MAYUS@example.com')
        self.assertTrue(user.check_password('x'))

    def test_create_superuser_activa_flags(self):
        admin = Usuario.objects.create_superuser(email='admin@example.com', password='secret', nombres='Admin')
        self.assertTrue(admin.is_staff)
        self.assertTrue(admin.is_superuser)
        self.assertTrue(admin.check_password('secret'))

    def test_create_superuser_falla_sin_flags(self):
        manager = UsuarioManager()
        with self.assertRaisesMessage(ValueError, 'Superuser must have is_staff=True.'):
            manager.create_superuser(email='admin2@example.com', password='secret', nombres='Admin', is_staff=False)
        with self.assertRaisesMessage(ValueError, 'Superuser must have is_superuser=True.'):
            manager.create_superuser(email='admin3@example.com', password='secret', nombres='Admin', is_superuser=False)
