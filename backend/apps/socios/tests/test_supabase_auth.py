import os
from datetime import datetime, timedelta, timezone

import jwt
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIRequestFactory

from apps.socios.auth import SupabaseAuthentication


User = get_user_model()


class SupabaseAuthenticationTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.secret = 'test-secret'
        self.addCleanup(self._reset_env)
        os.environ['SUPABASE_JWT_SECRET'] = self.secret
        os.environ['SUPABASE_JWT_AUDIENCE'] = 'authenticated'
        os.environ['SUPABASE_ADMIN_ROLES'] = 'admin'
        os.environ.pop('SUPABASE_ADMIN_EMAILS', None)

    def _reset_env(self):
        for key in (
            'SUPABASE_JWT_SECRET',
            'SUPABASE_JWT_AUDIENCE',
            'SUPABASE_ADMIN_ROLES',
            'SUPABASE_ADMIN_EMAILS',
        ):
            os.environ.pop(key, None)

    def _build_token(self, extra: dict | None = None) -> str:
        payload = {
            'sub': 'supabase-user-1',
            'aud': 'authenticated',
            'exp': int((datetime.now(timezone.utc) + timedelta(minutes=5)).timestamp()),
            'email': 'admin@example.com',
            'app_metadata': {'roles': ['admin']},
        }
        if extra:
            payload.update(extra)
        return jwt.encode(payload, self.secret, algorithm='HS256')

    def _authenticate(self, token: str):
        request = self.factory.get('/api/socios', HTTP_AUTHORIZATION=f'Bearer {token}')
        backend = SupabaseAuthentication()
        return backend.authenticate(request)

    def test_assigns_staff_flag_from_roles(self):
        user, _ = self._authenticate(self._build_token())
        self.assertTrue(user.is_staff)
        self.assertEqual(User.objects.count(), 1)

    def test_email_allowlist_grants_staff(self):
        os.environ['SUPABASE_ADMIN_ROLES'] = ''
        os.environ['SUPABASE_ADMIN_EMAILS'] = 'boss@example.com'
        token = self._build_token(
            {
                'email': 'boss@example.com',
                'app_metadata': {'roles': ['editor']},
                'sub': 'supabase-user-2',
            }
        )
        user, _ = self._authenticate(token)
        self.assertTrue(user.is_staff)
        self.assertEqual(user.email, 'boss@example.com')
