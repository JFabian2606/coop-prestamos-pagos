from types import SimpleNamespace

from django.test import SimpleTestCase

from apps.socios.audit import _diff, snapshot_socio, TRACKED_FIELDS


class AuditUtilsTests(SimpleTestCase):
    def test_snapshot_socio_lee_campos_rastreables(self):
        socio = SimpleNamespace(
            nombre_completo='Ana',
            documento='123',
            telefono='555',
            direccion='Calle 1',
            datos_fiscales={'ruc': '1'},
            estado='activo',
        )
        snap = snapshot_socio(socio)
        self.assertEqual(set(snap.keys()), set(TRACKED_FIELDS))
        self.assertEqual(snap['nombre_completo'], 'Ana')

    def test_diff_devuelve_cambios_previos_y_nuevos(self):
        before = {
            'nombre_completo': 'Ana',
            'documento': '123',
            'telefono': '555',
            'direccion': 'Calle 1',
            'datos_fiscales': {'ruc': '1'},
            'estado': 'activo',
        }
        after = {
            'nombre_completo': 'Ana Maria',
            'documento': '123',
            'telefono': '555-999',
            'direccion': 'Calle 9',
            'datos_fiscales': {'ruc': '2'},
            'estado': 'inactivo',
        }
        changed, prev, new = _diff(before, after)
        self.assertEqual(set(changed), {'nombre_completo', 'telefono', 'direccion', 'datos_fiscales', 'estado'})
        self.assertEqual(prev['estado'], 'activo')
        self.assertEqual(new['estado'], 'inactivo')
