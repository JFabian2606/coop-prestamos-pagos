from uuid import uuid4

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from apps.usuarios.models import Rol


User = get_user_model()


class UsuarioRolesApiTests(APITestCase):
    def setUp(self):
        self.rol_admin = Rol.objects.create(nombre="ADMIN")
        self.rol_cajero = Rol.objects.create(nombre="CAJERO")
        self.rol_socio = Rol.objects.create(nombre="SOCIO")

        self.admin = User.objects.create_superuser(
            email="admin@example.com",
            password="secret123",
            nombres="Admin",
            rol=self.rol_admin,
        )
        self.no_admin = User.objects.create_user(
            email="viewer@example.com",
            password="secret123",
            nombres="Viewer",
            rol=self.rol_socio,
            is_staff=False,
        )
        self.objetivo = User.objects.create_user(
            email="target@example.com",
            password="secret123",
            nombres="Target",
            rol=self.rol_cajero,
            is_staff=False,
        )
        self.client = APIClient()

    def authenticate(self, user):
        self.client.force_authenticate(user=user)

    def test_roles_list_requires_admin(self):
        self.authenticate(self.no_admin)
        response = self.client.get(reverse("roles-list"))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        self.authenticate(self.admin)
        response = self.client.get(reverse("roles-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        nombres = [item["nombre"] for item in response.data]
        self.assertEqual(nombres, ["ADMIN", "CAJERO", "SOCIO"])

    def test_patch_role_updates_user_and_staff_flag(self):
        self.authenticate(self.admin)
        url = reverse("usuarios-role-update", kwargs={"usuario_id": str(self.objetivo.id)})

        resp_admin = self.client.patch(url, {"rol_id": str(self.rol_admin.id)}, format="json")
        self.assertEqual(resp_admin.status_code, status.HTTP_200_OK)
        self.objetivo.refresh_from_db()
        self.assertEqual(self.objetivo.rol, self.rol_admin)
        self.assertTrue(self.objetivo.is_staff)

        resp_cajero = self.client.patch(url, {"rol_id": str(self.rol_cajero.id)}, format="json")
        self.assertEqual(resp_cajero.status_code, status.HTTP_200_OK)
        self.objetivo.refresh_from_db()
        self.assertEqual(self.objetivo.rol, self.rol_cajero)
        self.assertFalse(self.objetivo.is_staff)

    def test_patch_role_requires_admin_and_valid_role(self):
        url = reverse("usuarios-role-update", kwargs={"usuario_id": str(self.objetivo.id)})

        self.authenticate(self.no_admin)
        resp_forbidden = self.client.patch(url, {"rol_id": str(self.rol_admin.id)}, format="json")
        self.assertEqual(resp_forbidden.status_code, status.HTTP_403_FORBIDDEN)

        self.authenticate(self.admin)
        resp_not_found = self.client.patch(url, {"rol_id": str(uuid4())}, format="json")
        self.assertEqual(resp_not_found.status_code, status.HTTP_404_NOT_FOUND)
