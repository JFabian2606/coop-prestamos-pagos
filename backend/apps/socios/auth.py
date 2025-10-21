import os
from typing import Optional, Tuple

import jwt
from django.contrib.auth import get_user_model
from django.utils.translation import gettext_lazy as _
from rest_framework import authentication, exceptions


User = get_user_model()


class SupabaseAuthentication(authentication.BaseAuthentication):
    """
    Autenticación basada en JWT emitidos por Supabase.

    - Lee el header Authorization: Bearer <token>
    - Verifica firma con SUPABASE_JWT_SECRET (HS256)
    - Busca o crea un usuario Django por email
    """

    www_authenticate_realm = 'api'

    def authenticate(self, request) -> Optional[Tuple[User, None]]:
        auth = authentication.get_authorization_header(request).split()

        if not auth or auth[0].lower() != b'bearer':
            return None

        if len(auth) == 1:
            raise exceptions.AuthenticationFailed(_('Invalid Authorization header. No token provided.'))
        elif len(auth) > 2:
            raise exceptions.AuthenticationFailed(_('Invalid Authorization header.'))

        token = auth[1]
        if token is None:
            return None

        try:
            secret = os.environ.get('SUPABASE_JWT_SECRET')
            if not secret:
                raise exceptions.AuthenticationFailed(_('Server misconfigured: SUPABASE_JWT_SECRET not set'))

            payload = jwt.decode(token, secret, algorithms=['HS256'])
        except jwt.ExpiredSignatureError:
            raise exceptions.AuthenticationFailed(_('Token has expired'))
        except jwt.InvalidTokenError:
            raise exceptions.AuthenticationFailed(_('Invalid token'))

        email = payload.get('email')
        sub = payload.get('sub')

        if not email and not sub:
            raise exceptions.AuthenticationFailed(_('Token missing required claims'))

        # Resolve or create the user
        user = None
        if email:
            user = User.objects.filter(email__iexact=email).first()

        if not user:
            # Fallback by sub as username if email is missing
            username = (email or sub or 'user').lower()
            # Ensure username uniqueness
            base_username = username
            i = 1
            while User.objects.filter(username=username).exists():
                i += 1
                username = f"{base_username}{i}"

            user = User.objects.create(
                username=username,
                email=email or '',
            )

        return (user, None)

    def authenticate_header(self, request) -> str:
        return f'Bearer realm="{self.www_authenticate_realm}"'

