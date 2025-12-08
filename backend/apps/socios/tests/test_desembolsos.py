from decimal import Decimal
from datetime import date

from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.socios.models import Prestamo, Socio, TipoPrestamo, Desembolso, Pago
from apps.usuarios.models import Usuario, Rol


class DesembolsoApiTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        rol_socio = Rol.objects.create(nombre="SOCIO")
        rol_tesorero = Rol.objects.create(nombre="TESORERO")
        cls.tesorero = Usuario.objects.create_user(
            email="tesorero@test.com",
            password="segura",
            nombres="Tesorero",
            rol=rol_tesorero,
            activo=True,
        )
        cls.socio_user = Usuario.objects.create_user(
            email="socio@test.com",
            password="segura",
            nombres="Socio",
            rol=rol_socio,
            activo=True,
        )
        cls.socio = getattr(cls.socio_user, "socio", None)
        if not cls.socio:
            cls.socio = Socio.objects.create(
                usuario=cls.socio_user,
                nombre_completo="Socio Demo",
                documento="DOC123",
                estado=Socio.ESTADO_ACTIVO,
                fecha_alta=date.today(),
            )
        tipo = TipoPrestamo.objects.create(
            nombre="Demo",
            descripcion="",
            tasa_interes_anual=5.0,
            plazo_meses=12,
            requisitos=[],
            activo=True,
        )
        cls.prestamo = Prestamo.objects.create(
            socio=cls.socio,
            tipo=tipo,
            monto=Decimal("1000000.00"),
            tasa_interes=Decimal("5.0"),
            estado=Prestamo.Estados.ACTIVO,
            fecha_desembolso=date.today(),
        )

    def setUp(self):
        self.client = APIClient()

    def test_post_desembolso_requiere_tesorero(self):
        url = reverse("desembolsos-list-create")
        payload = {
            "prestamo_id": str(self.prestamo.id),
            "monto": "500000.00",
            "metodo_pago": "transferencia",
            "referencia": "REF-1",
        }
        # sin auth
        resp = self.client.post(url, payload, format="json")
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

        # con rol tesorero
        self.client.force_authenticate(user=self.tesorero)
        resp_ok = self.client.post(url, payload, format="json")
        self.assertEqual(resp_ok.status_code, status.HTTP_201_CREATED, resp_ok.data)
        self.assertEqual(Desembolso.objects.count(), 1)

    def test_post_rechaza_prestamo_no_aprobado(self):
        self.client.force_authenticate(user=self.tesorero)
        self.prestamo.estado = Prestamo.Estados.MOROSO
        self.prestamo.save(update_fields=["estado"])

        url = reverse("desembolsos-list-create")
        payload = {
            "prestamo_id": str(self.prestamo.id),
            "monto": "500000.00",
            "metodo_pago": "transferencia",
        }
        resp = self.client.post(url, payload, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("prestamo_id", resp.data)

    def test_prestamos_aprobados_excluye_con_desembolso(self):
        prestamo_sin_desembolso = Prestamo.objects.create(
            socio=self.socio,
            tipo=self.prestamo.tipo,
            monto=Decimal("750000.00"),
            tasa_interes=Decimal("5.0"),
            estado=Prestamo.Estados.ACTIVO,
            fecha_desembolso=date.today(),
        )
        prestamo_con_pago = Prestamo.objects.create(
            socio=self.socio,
            tipo=self.prestamo.tipo,
            monto=Decimal("500000.00"),
            tasa_interes=Decimal("5.0"),
            estado=Prestamo.Estados.ACTIVO,
            fecha_desembolso=date.today(),
        )
        Pago.objects.create(
            prestamo=prestamo_con_pago,
            monto=Decimal("10000.00"),
            fecha_pago=date.today(),
            metodo="efectivo",
            referencia="pago prueba",
        )
        Desembolso.objects.create(
            prestamo=self.prestamo,
            socio=self.socio,
            monto=Decimal("1234.00"),
            metodo_pago="efectivo",
            referencia="ya pagado",
        )
        url = reverse("prestamos-aprobados")
        self.client.force_authenticate(user=self.tesorero)
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        ids = {item["id"] for item in resp.data["results"]}
        self.assertIn(str(prestamo_sin_desembolso.id), ids)
        self.assertNotIn(str(self.prestamo.id), ids)
        self.assertNotIn(str(prestamo_con_pago.id), ids)

    def test_prestamos_aprobados_excluye_rechazados(self):
        prestamo_rechazado = Prestamo.objects.create(
            socio=self.socio,
            tipo=self.prestamo.tipo,
            monto=Decimal("999999.00"),
            tasa_interes=Decimal("5.0"),
            estado="rechazado",
            fecha_desembolso=date.today(),
        )
        url = reverse("prestamos-aprobados")
        self.client.force_authenticate(user=self.tesorero)
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        ids = {item["id"] for item in resp.data["results"]}
        self.assertNotIn(str(prestamo_rechazado.id), ids)

    def test_get_listado_con_tesorero(self):
        Desembolso.objects.create(
            prestamo=self.prestamo,
            socio=self.socio,
            monto=Decimal("100000.00"),
            metodo_pago="efectivo",
            referencia="Caja",
        )
        url = reverse("desembolsos-list-create")
        self.client.force_authenticate(user=self.tesorero)
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["count"], 1)
        self.assertEqual(resp.data["results"][0]["prestamo_id"], str(self.prestamo.id))
