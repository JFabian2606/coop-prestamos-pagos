import uuid
from datetime import date

from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils import timezone
from django.db import connection
from rest_framework import status
from rest_framework.test import APIClient

from apps.socios.models import Socio, TipoPrestamo
from apps.usuarios.models import Usuario, Rol


def ensure_tables_with_observaciones():
    """Crea tablas auxiliares de producto y solicitud para pruebas de analista."""
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
                tipo_prestamo_id TEXT,
                observaciones TEXT
            );
            """
        )


@override_settings(MIGRATION_MODULES={"usuarios": None})
class SolicitudAnalistaEndpointsTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        ensure_tables_with_observaciones()
        cls.rol_socio = Rol.objects.create(nombre="SOCIO")
        cls.rol_analista = Rol.objects.create(nombre="ANALISTA")
        cls.analista = Usuario.objects.create_user(
            email="analista@test.com",
            password="claveSegura123",
            nombres="Analista",
            rol=cls.rol_analista,
            is_staff=False,
        )
        cls.usuario_socio = Usuario.objects.create_user(
            email="socio@test.com",
            password="claveSegura123",
            nombres="Socio",
            rol=cls.rol_socio,
            activo=True,
        )
        cls.socio = getattr(cls.usuario_socio, "socio", None)
        if not cls.socio:
            cls.socio = Socio.objects.create(
                usuario=cls.usuario_socio,
                nombre_completo="Socio Demo",
                documento="DOC-321",
                estado=Socio.ESTADO_ACTIVO,
                fecha_alta=date.today(),
            )
        cls.tipo = TipoPrestamo.objects.create(
            nombre="Consumo",
            descripcion="Linea consumo",
            tasa_interes_anual=8.5,
            plazo_meses=60,
            requisitos=["dni"],
            activo=True,
        )
        # precargar producto
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

    def setUp(self):
        self.client = APIClient()

    def _insert_solicitud(self, estado: str = "pendiente") -> str:
        solicitud_id = str(uuid.uuid4())
        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO solicitud (id, socio_id, monto, tasa_interes, plazo_meses, descripcion, estado, created_at, updated_at, producto_id, tipo_prestamo_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                [
                    solicitud_id,
                    str(self.socio.id),
                    5000000,
                    float(self.tipo.tasa_interes_anual),
                    self.tipo.plazo_meses,
                    "Solicitud demo",
                    estado,
                    timezone.now().isoformat(),
                    timezone.now().isoformat(),
                    str(self.tipo.id),
                    str(self.tipo.id),
                ],
            )
        return solicitud_id

    def test_get_evaluar_entrega_detalle_y_recomendacion(self):
        solicitud_id = self._insert_solicitud()
        url = reverse("solicitudes-evaluar", kwargs={"solicitud_id": solicitud_id})

        self.client.force_authenticate(self.analista)
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["solicitud"]["id"], solicitud_id)
        self.assertEqual(resp.data["socio"]["documento"], self.socio.documento)
        self.assertIn(resp.data["analisis"]["recomendacion"], {"aprobar", "revisar", "rechazar"})

    def test_put_evaluar_guarda_observaciones(self):
        solicitud_id = self._insert_solicitud()
        url = reverse("solicitudes-evaluar", kwargs={"solicitud_id": solicitud_id})

        self.client.force_authenticate(self.analista)
        resp = self.client.put(url, {"observaciones": "Ingresos verificados"}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        with connection.cursor() as cursor:
            cursor.execute("SELECT observaciones FROM solicitud WHERE id = ?", [solicitud_id])
            row = cursor.fetchone()
        self.assertIsNotNone(row)
        self.assertEqual(row[0], "Ingresos verificados")

    def test_aprobar_actualiza_estado_y_comentario(self):
        solicitud_id = self._insert_solicitud()
        url = reverse("solicitudes-aprobar", kwargs={"solicitud_id": solicitud_id})

        self.client.force_authenticate(self.analista)
        resp = self.client.patch(url, {"comentario": "Aprobada por score"}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        with connection.cursor() as cursor:
            cursor.execute("SELECT estado, observaciones FROM solicitud WHERE id = ?", [solicitud_id])
            row = cursor.fetchone()
        self.assertEqual(row[0], "aprobado")
        # comentario se guarda en observaciones si existe
        self.assertEqual(row[1], "Aprobada por score")

    def test_rechazar_requiere_analista(self):
        solicitud_id = self._insert_solicitud()
        url = reverse("solicitudes-rechazar", kwargs={"solicitud_id": solicitud_id})

        self.client.force_authenticate(self.usuario_socio)
        resp = self.client.patch(url, {"comentario": "Falta documentacion"}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
