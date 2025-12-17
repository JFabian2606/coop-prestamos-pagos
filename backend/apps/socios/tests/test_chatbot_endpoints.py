from decimal import Decimal
from datetime import date
import uuid

from django.test import TestCase
from django.urls import reverse
from django.db import connection
from rest_framework import status
from rest_framework.test import APIClient

from apps.socios.models import Socio, TipoPrestamo, Prestamo, Pago, Desembolso
from apps.usuarios.models import Usuario, Rol


def ensure_solicitud_table():
    """Crea una tabla mínima de solicitud para las pruebas del chatbot."""
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


class ChatbotEndpointsTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        ensure_solicitud_table()
        rol_socio = Rol.objects.create(nombre="SOCIO")
        cls.usuario = Usuario.objects.create_user(
            email="chatbot@test.com",
            password="segura123",
            nombres="Cliente Chatbot",
            rol=rol_socio,
            activo=True,
        )
        cls.socio = getattr(cls.usuario, "socio", None)
        if not cls.socio:
            cls.socio = Socio.objects.create(
                usuario=cls.usuario,
                nombre_completo="Cliente Chatbot",
                documento="CC-CHAT",
                estado=Socio.ESTADO_ACTIVO,
                fecha_alta=date.today(),
            )

        cls.tipo = TipoPrestamo.objects.create(
            nombre="Libre inversión",
            descripcion="Producto demo para chatbot",
            tasa_interes_anual=10.0,
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
                    500000.0,
                    10.0,
                    12,
                    "Solicitud en revision",
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
                    700000.0,
                    10.0,
                    12,
                    "Solicitud aprobada",
                    "aprobado",
                    str(cls.tipo.id),
                    str(cls.tipo.id),
                ],
            )

        cls.prestamo = Prestamo.objects.create(
            id=cls.solicitud_aprobada_id,
            socio=cls.socio,
            tipo=cls.tipo,
            monto=Decimal("700000.00"),
            tasa_interes=Decimal("10.00"),
            estado="aprobado",
            fecha_desembolso=date.today(),
            fecha_vencimiento=date.today(),
        )
        Desembolso.objects.create(
            prestamo=cls.prestamo,
            socio=cls.socio,
            monto=Decimal("700000.00"),
            metodo_pago="transferencia",
            referencia="DES-CHAT",
        )
        Pago.objects.create(
            prestamo=cls.prestamo,
            monto=Decimal("100000.00"),
            fecha_pago=date.today(),
            metodo="tarjeta",
            referencia="PAGO-CHAT",
        )

    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(user=self.usuario)

    def test_detalle_tipo_prestamo_para_chatbot(self):
        url = reverse("tipos-prestamo-public-detail", args=[self.tipo.id])
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.data)
        self.assertEqual(str(resp.data["id"]), str(self.tipo.id))
        self.assertEqual(resp.data["nombre"], self.tipo.nombre)
        self.assertIn("requisitos", resp.data)
        self.assertIn("mensaje", resp.data)  # cuando no hay requisitos configurados

    def test_estado_solicitud_pendiente(self):
        url = reverse("solicitudes-estado-cliente", args=[self.solicitud_pendiente_id])
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.data)
        self.assertEqual(resp.data["estado"], "pendiente")
        self.assertIsNone(resp.data["prestamo"])
        self.assertIsNotNone(resp.data["solicitud"])
        self.assertIn("mensajes", resp.data)

    def test_estado_solicitud_con_prestamo_y_pagos(self):
        url = reverse("solicitudes-estado-cliente", args=[self.solicitud_aprobada_id])
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.data)
        prestamo = resp.data["prestamo"]
        self.assertIsNotNone(prestamo)
        self.assertEqual(prestamo["id"], str(self.prestamo.id))
        self.assertIn(prestamo["estado"], {"aprobado", "desembolsado"})
        self.assertGreaterEqual(len(resp.data["pagos"]), 1)
        self.assertGreaterEqual(Decimal(prestamo["saldo_pendiente"]), Decimal("0"))

