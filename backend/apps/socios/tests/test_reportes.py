from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import patch

from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory

from apps.socios.views import ReportesAdminView


class FakeQS(list):
    def __init__(self, items):
        super().__init__(items)

    def all(self, *args, **kwargs):
        return self

    def select_related(self, *_args, **_kwargs):
        return self

    def annotate(self, **_kwargs):
        return self

    def order_by(self, *_args, **_kwargs):
        return self

    def filter(self, *args, **_kwargs):
        # For these tests we do not need actual filtering; return self to keep shape.
        return self

    def count(self):
        return len(self)


class FakeSocio:
    def __init__(self, id="s1", nombre="Fabian", documento="123", email="fabian@mail.com", estado="activo"):
        self.id = id
        self.nombre_completo = nombre
        self.documento = documento
        self.estado = estado
        self.usuario = SimpleNamespace(email=email)
        self.created_at = None
        self.fecha_alta = None


class FakePrestamo:
    def __init__(
        self,
        id="p1",
        monto=Decimal("1000.00"),
        estado="activo",
        saldo_pendiente=Decimal("0"),
        socio=None,
        tipo=None,
        desembolsos_count=1,
    ):
        self.id = id
        self.monto = monto
        self.estado = estado
        self.estado_norm = estado
        self.saldo_pendiente = saldo_pendiente
        self.socio = socio
        self.tipo = tipo
        self.desembolsos_count = desembolsos_count
        self.fecha_desembolso = None
        self.fecha_vencimiento = None

    @property
    def total_pagado(self):
        return self.monto


class ReportesViewTest(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.view = ReportesAdminView.as_view()
        self.admin = SimpleNamespace(is_staff=True, is_active=True)

    def test_prestamo_pagado_se_reporta_pagado(self):
        socio = FakeSocio()
        prestamo_pagado = FakePrestamo(
            id="p2",
            estado="activo",
            saldo_pendiente=Decimal("0"),
            socio=socio,
            tipo=SimpleNamespace(id="t1", nombre="Libre inversion"),
            desembolsos_count=1,
        )
        with patch("apps.socios.views.Socio") as socio_model, patch("apps.socios.views.Prestamo") as prestamo_model:
            socio_model.objects = FakeQS([])
            prestamo_model.objects = FakeQS([prestamo_pagado])

            request = self.factory.get("/api/reportes/", {"entidad": "prestamos"})
            request.user = self.admin
            response = self.view(request)

        self.assertEqual(response.status_code, 200)
        data = response.data
        self.assertIsNotNone(data.get("prestamos"))
        self.assertEqual(data["prestamos"]["total"], 1)
        self.assertEqual(data["prestamos"]["items"][0]["estado_visible"], "pagado")

    def test_filtros_no_explotan_con_busqueda(self):
        socio = FakeSocio(nombre="Ana", documento="555", email="ana@mail.com")
        prestamo = FakePrestamo(
            id="p3",
            estado="aprobado",
            saldo_pendiente=Decimal("500.00"),
            socio=socio,
            tipo=SimpleNamespace(id="t2", nombre="Demo"),
            desembolsos_count=0,
        )
        with patch("apps.socios.views.Socio") as socio_model, patch("apps.socios.views.Prestamo") as prestamo_model:
            socio_model.objects = FakeQS([socio])
            prestamo_model.objects = FakeQS([prestamo])

            request = self.factory.get("/api/reportes/", {"q": "555", "entidad": "todos"})
            request.user = self.admin
            response = self.view(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["socios"]["total"], 1)
        self.assertEqual(response.data["prestamos"]["total"], 1)
