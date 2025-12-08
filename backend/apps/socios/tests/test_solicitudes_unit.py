import uuid

from django.test import SimpleTestCase

from apps.socios.views import (
    _adjuntar_observacion_en_descripcion,
    _extraer_observaciones,
    _obs_column,
    _is_analista,
)


class DummyRol:
    def __init__(self, nombre: str):
        self.nombre = nombre


class DummyUser:
    def __init__(self, rol_nombre: str = "", is_staff: bool = False, is_superuser: bool = False):
        self.rol = DummyRol(rol_nombre) if rol_nombre else None
        self.is_staff = is_staff
        self.is_superuser = is_superuser


class SolicitudesHelperTests(SimpleTestCase):
    def test_obs_column_prefiere_observaciones_luego_comentarios(self):
        self.assertEqual(_obs_column({"observaciones", "estado"}), "observaciones")
        self.assertEqual(_obs_column({"comentarios", "estado"}), "comentarios")
        self.assertIsNone(_obs_column({"estado", "monto"}))

    def test_extraer_observaciones_prioriza_campo(self):
        self.assertEqual(_extraer_observaciones({"observaciones": "nota"}), "nota")
        self.assertEqual(_extraer_observaciones({"comentarios": "coment"}), "coment")

    def test_extraer_observaciones_desde_descripcion_con_marcador(self):
        row = {"descripcion": "[OBS_ANALISTA] primera\notro"}
        self.assertEqual(_extraer_observaciones(row), "primera")

    def test_adjuntar_observacion_evita_duplicados(self):
        base = "algo"
        res = _adjuntar_observacion_en_descripcion(base, "nota")
        self.assertIn("nota", res)
        # si ya existe no duplica
        res2 = _adjuntar_observacion_en_descripcion(res, "nota")
        self.assertEqual(res, res2)

    def test_is_analista_acepta_rol_staff_o_superuser(self):
        self.assertTrue(_is_analista(DummyUser("analista")))
        self.assertTrue(_is_analista(DummyUser(is_staff=True)))
        self.assertTrue(_is_analista(DummyUser(is_superuser=True)))
        self.assertFalse(_is_analista(DummyUser("socio")))
