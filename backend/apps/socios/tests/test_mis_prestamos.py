from decimal import Decimal
from datetime import date
import uuid

from django.test import TestCase
from django.urls import reverse
from django.db import connection
from rest_framework import status
from rest_framework.test import APIClient

from apps.socios.models import Socio, TipoPrestamo, Prestamo, Desembolso, Pago
from apps.usuarios.models import Usuario, Rol


def ensure_solicitud_table():
    """Crea una tabla minima de solicitud para las pruebas de socio."""
    with connection.cursor() as cursor:
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS solicitud (
                id TEXT PRIMARY KEY,
                socio_id TEXT,
                monto REAL,
                tasa_interes REAL,
                plazo_meses INTEGER,
                descripcion TEXT,
                estado TEXT,
                created_at TEXT,
                updated_at TEXT,
                producto_id TEXT,
                tipo_prestamo_id TEXT
            );
            """
        )


class MisPrestamosApiTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        ensure_solicitud_table()
        rol_socio = Rol.objects.create(nombre="SOCIO")
        cls.usuario = Usuario.objects.create_user(
            email="misprestamos@test.com",
            password="segura123",
            nombres="Cliente Demo",
            rol=rol_socio,
            activo=True,
        )
        cls.socio = getattr(cls.usuario, "socio", None)
        if not cls.socio:
            cls.socio = Socio.objects.create(
                usuario=cls.usuario,
                nombre_completo="Cliente Demo",
                documento="CC123",
                estado=Socio.ESTADO_ACTIVO,
                fecha_alta=date.today(),
            )
        cls.tipo = TipoPrestamo.objects.create(
            nombre="Consumo",
            descripcion="Demo",
            tasa_interes_anual=5.0,
            plazo_meses=12,
            requisitos=[],
            activo=True,
        )

        cls.solicitud_pendiente_id = uuid.uuid4()
        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT OR REPLACE INTO solicitud
                (id, socio_id, monto, tasa_interes, plazo_meses, descripcion, estado, created_at, updated_at, producto_id, tipo_prestamo_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), ?, ?)
                """,
                [
                    str(cls.solicitud_pendiente_id),
                    str(cls.socio.id),
                    800000.0,
                    5.0,
                    12,
                    "Pendiente de revision",
                    "pendiente",
                    str(cls.tipo.id),
                    str(cls.tipo.id),
                ],
            )

        cls.solicitud_aprobada_id = uuid.uuid4()
        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT OR REPLACE INTO solicitud
                (id, socio_id, monto, tasa_interes, plazo_meses, descripcion, estado, created_at, updated_at, producto_id, tipo_prestamo_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), ?, ?)
                """,
                [
                    str(cls.solicitud_aprobada_id),
                    str(cls.socio.id),
                    1200000.0,
                    5.0,
                    12,
                    "Solicitud aprobada",
                    "aprobado",
                    str(cls.tipo.id),
                    str(cls.tipo.id),
                ],
            )

        cls.prestamo_desembolsado = Prestamo.objects.create(
            id=cls.solicitud_aprobada_id,
            socio=cls.socio,
            tipo=cls.tipo,
            monto=Decimal("1200000.00"),
            tasa_interes=Decimal("5.0"),
            estado="aprobado",
            fecha_desembolso=date.today(),
            fecha_vencimiento=date.today(),
        )
        Desembolso.objects.create(
            prestamo=cls.prestamo_desembolsado,
            socio=cls.socio,
            monto=Decimal("1200000.00"),
            metodo_pago="efectivo",
            referencia="REF-DEMO",
        )

    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(user=self.usuario)

    def test_lista_mis_prestamos_con_resumen(self):
        url = reverse("prestamos-mis")
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.data
        self.assertIn("prestamos", data)
        estados = {item["estado"] for item in data["prestamos"]}
        self.assertIn("pendiente", estados)
        self.assertIn("desembolsado", estados)
        self.assertEqual(data["resumen"]["pendientes"], 1)
        self.assertEqual(data["resumen"]["desembolsados"], 1)
        desembolsado = next(item for item in data["prestamos"] if item["estado"] == "desembolsado")
        self.assertTrue(desembolsado["puede_pagar"])
        self.assertGreaterEqual(desembolsado["cuotas_restantes"], 1)

    def test_pagar_cuotas_simulado(self):
        url = reverse("prestamos-pago-simulado", args=[self.prestamo_desembolsado.id])
        resp = self.client.post(url, {"cuotas": 2, "metodo": "tarjeta"}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.data)
        self.assertEqual(Pago.objects.filter(prestamo=self.prestamo_desembolsado).count(), 1)
        self.assertIn(resp.data["prestamo"]["estado"], {"pagado", "desembolsado", "aprobado"})
        monto_pagado = Decimal(resp.data["pago"]["monto"])
        self.assertGreater(monto_pagado, Decimal("0"))
