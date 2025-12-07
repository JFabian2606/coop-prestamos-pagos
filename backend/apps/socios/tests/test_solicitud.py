from datetime import date
import uuid

from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from django.db import connection
from rest_framework.test import APIClient
from django.test import override_settings

from apps.socios.models import TipoPrestamo, Socio
from apps.usuarios.models import Usuario, Rol


def ensure_aux_tables():
    """Crea tablas auxiliares producto_prestamo y solicitud para las pruebas."""
    with connection.cursor() as cursor:
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS producto_prestamo (
                id TEXT PRIMARY KEY,
                nombre TEXT NOT NULL,
                descripcion TEXT,
                tasa_interes REAL,
                plazo_meses INTEGER,
                tipo TEXT NOT NULL,
                tasa_nominal_anual REAL,
                plazo_max_meses INTEGER,
                activo BOOLEAN,
                created_at TEXT,
                updated_at TEXT
            );
            """
        )
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


@override_settings(MIGRATION_MODULES={"usuarios": None})
class SolicitudPrestamoTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        ensure_aux_tables()
        rol = Rol.objects.create(nombre="SOCIO")
        cls.usuario = Usuario.objects.create_user(
            email="socio@test.com",
            password="claveSegura123",
            nombres="Socio Test",
            rol=rol,
            activo=True,
        )
        cls.tipo = TipoPrestamo.objects.create(
            nombre="Hipotecario vivienda",
            descripcion="Demo",
            tasa_interes_anual=9.25,
            plazo_meses=180,
            requisitos=["dni"],
            activo=True,
        )
        # precargar producto para evitar dependencias de columnas extra
        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT OR REPLACE INTO producto_prestamo
                (id, nombre, descripcion, tasa_interes, plazo_meses, tipo, tasa_nominal_anual, plazo_max_meses, activo, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                [
                    str(cls.tipo.id),
                    cls.tipo.nombre,
                    cls.tipo.descripcion,
                    float(cls.tipo.tasa_interes_anual),
                    cls.tipo.plazo_meses,
                    cls.tipo.nombre,
                    float(cls.tipo.tasa_interes_anual),
                    cls.tipo.plazo_meses,
                    True,
                    timezone.now().isoformat(),
                    timezone.now().isoformat(),
                ],
            )
        cls.socio = getattr(cls.usuario, "socio", None)
        if not cls.socio:
            cls.socio = Socio.objects.create(
                usuario=cls.usuario,
                nombre_completo="Socio Test",
                documento="123",
                estado=Socio.ESTADO_ACTIVO,
                fecha_alta=date.today(),
            )

    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(user=self.usuario)

    def test_simulacion_con_plazo_personalizado_valido(self):
        url = reverse("prestamos-simular")
        resp = self.client.post(
            url,
            {
                "tipo_prestamo_id": str(self.tipo.id),
                "monto": "5000000",
                "plazo_meses": 60,
            },
            format="json",
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["plazo_meses"], 60)
        self.assertIn("cuota_mensual", resp.data)

    def test_simulacion_rechaza_plazo_fuera_de_rango(self):
        url = reverse("prestamos-simular")
        resp = self.client.post(
            url,
            {
                "tipo_prestamo_id": str(self.tipo.id),
                "monto": "5000000",
                "plazo_meses": 5,
            },
            format="json",
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("plazo_meses", resp.data)

    def test_solicitud_crea_producto_y_registra(self):
        url = reverse("prestamos-solicitudes")
        resp = self.client.post(
            url,
            {
                "tipo_prestamo_id": str(self.tipo.id),
                "monto": "5000000",
                "plazo_meses": 120,
                "descripcion": "Reforma",
            },
            format="json",
        )
        self.assertEqual(resp.status_code, 201, msg=resp.data)
        self.assertIn("solicitud_id", resp.data)
        solicitud_id = resp.data["solicitud_id"]

        # verificar que la fila exista en tabla solicitud con producto_id correcto
        with connection.cursor() as cursor:
            cursor.execute("SELECT producto_id, plazo_meses FROM solicitud WHERE id = %s", [solicitud_id])
            row = cursor.fetchone()
        self.assertIsNotNone(row)
        producto_id, plazo_guardado = row
        self.assertEqual(producto_id, str(self.tipo.id))
        self.assertEqual(plazo_guardado, 120)
