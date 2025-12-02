import os

from django.test import SimpleTestCase

from apps.socios.auth import SupabaseAuthentication


class SupabaseAuthUtilsTests(SimpleTestCase):
    def setUp(self):
        self.backend = SupabaseAuthentication()
        self.addCleanup(self._reset_env)

    def _reset_env(self):
        for key in ('SUPABASE_ADMIN_EMAILS', 'SUPABASE_ADMIN_ROLES'):
            os.environ.pop(key, None)

    def test_should_be_admin_por_email(self):
        os.environ['SUPABASE_ADMIN_EMAILS'] = 'boss@example.com'
        result = self.backend._should_be_admin('boss@example.com', payload={})
        self.assertTrue(result)

    def test_should_be_admin_por_roles(self):
        os.environ['SUPABASE_ADMIN_ROLES'] = 'admin,owner'
        payload = {'app_metadata': {'roles': ['Admin']}}
        result = self.backend._should_be_admin('user@example.com', payload=payload)
        self.assertTrue(result)

    def test_extract_roles_combine_fuentes(self):
        payload = {
            'app_metadata': {'roles': ['admin', 'editor']},
            'role': 'owner',
            'name': 'Test',
        }
        roles = self.backend._extract_roles(payload)
        self.assertIn('admin', roles)
        self.assertIn('owner', roles)
