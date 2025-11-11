import logging
import os
from typing import Any, Dict, Optional, Set, Tuple

import jwt
from django.contrib.auth import get_user_model
from django.utils.translation import gettext_lazy as _
from rest_framework import authentication, exceptions


User = get_user_model()
logger = logging.getLogger(__name__)


class SupabaseAuthentication(authentication.BaseAuthentication):
    """
    Autenticación basada en JWT emitidos por Supabase.

    - Lee el header Authorization: Bearer <token>
    - Verifica firma con SUPABASE_JWT_SECRET
    - Sincroniza los flags de administrador según claims/env
    - Busca o crea un usuario Django por email/sub
    """

    www_authenticate_realm = 'api'
    _default_audience = {'authenticated'}

    def authenticate(self, request) -> Optional[Tuple[User, None]]:
        auth = authentication.get_authorization_header(request).split()
        if not auth or auth[0].lower() != b'bearer':
            return None

        if len(auth) == 1:
            raise exceptions.AuthenticationFailed(_('Invalid Authorization header. No token provided.'))
        if len(auth) > 2:
            raise exceptions.AuthenticationFailed(_('Invalid Authorization header.'))

        try:
            token = auth[1].decode('utf-8')
        except UnicodeDecodeError as exc:
            raise exceptions.AuthenticationFailed(_('Invalid token')) from exc

        payload = self._decode_payload(token)

        sub = payload.get('sub')
        email = payload.get('email')
        if not sub and not email:
            raise exceptions.AuthenticationFailed(_('Token missing required claims'))

        user = self._resolve_user(email=email, subject=sub, payload=payload)
        return (user, None)

    def authenticate_header(self, request) -> str:
        return f'Bearer realm="{self.www_authenticate_realm}"'

    # --- helpers ---------------------------------------------------------

    def _decode_payload(self, token: str) -> Dict[str, Any]:
        secret = os.environ.get('SUPABASE_JWT_SECRET')
        if not secret:
            logger.error('SUPABASE_JWT_SECRET not configured')
            raise exceptions.AuthenticationFailed(_('Server misconfigured: SUPABASE_JWT_SECRET not set'))

        algorithms = self._env_list('SUPABASE_JWT_ALGORITHMS', default='HS256')
        audiences = self._env_set('SUPABASE_JWT_AUDIENCE') or self._default_audience
        issuer = os.environ.get('SUPABASE_JWT_ISS')
        leeway = self._get_leeway()

        decode_kwargs: Dict[str, Any] = {
            'key': secret,
            'algorithms': algorithms,
            'options': {'require': ['exp', 'sub']},
            'leeway': leeway,
        }
        if audiences:
            decode_kwargs['audience'] = list(audiences)
        if issuer:
            decode_kwargs['issuer'] = issuer

        try:
            return jwt.decode(token, **decode_kwargs)
        except jwt.ExpiredSignatureError as exc:
            raise exceptions.AuthenticationFailed(_('Token has expired')) from exc
        except jwt.InvalidAudienceError as exc:
            raise exceptions.AuthenticationFailed(_('Token was issued for a different audience')) from exc
        except jwt.InvalidIssuedAtError as exc:
            raise exceptions.AuthenticationFailed(_('Token has invalid iat claim')) from exc
        except jwt.InvalidTokenError as exc:
            logger.warning('Supabase token rejected: %s', exc)
            raise exceptions.AuthenticationFailed(_('Invalid token')) from exc

    def _resolve_user(self, *, email: Optional[str], subject: Optional[str], payload: Dict[str, Any]) -> User:
        normalized_email = self._normalize_email(email)
        user: Optional[User] = None

        if normalized_email:
            user = User.objects.filter(email__iexact=normalized_email).first()

        if not user and subject:
            user = User.objects.filter(username=subject).first()

        if not user:
            username = self._build_username(normalized_email or subject or 'user')
            extra_fields: Dict[str, Any] = {}
            full_name = self._extract_full_name(payload)
            if full_name:
                extra_fields['first_name'] = full_name[:150]
            user = User.objects.create_user(
                username=username,
                email=normalized_email or '',
                password=None,
                **extra_fields,
            )
            logger.debug('Created local user %s from Supabase subject %s', user.pk, subject)

        self._sync_profile(user, normalized_email, payload)
        self._sync_staff_flag(user, normalized_email, payload)
        return user

    def _sync_profile(self, user: User, normalized_email: str, payload: Dict[str, Any]) -> None:
        updates: Set[str] = set()
        if normalized_email and user.email.casefold() != normalized_email.casefold():
            user.email = normalized_email
            updates.add('email')

        full_name = self._extract_full_name(payload)
        if full_name and user.first_name != full_name[:150]:
            user.first_name = full_name[:150]
            updates.add('first_name')

        if updates:
            user.save(update_fields=list(updates))

    def _sync_staff_flag(self, user: User, normalized_email: str, payload: Dict[str, Any]) -> None:
        if user.is_superuser:
            return

        should_be_admin = self._should_be_admin(normalized_email, payload)
        if should_be_admin == user.is_staff:
            return

        user.is_staff = should_be_admin
        user.save(update_fields=['is_staff'])
        logger.info(
            'Updated staff flag for user %s -> %s based on Supabase claims',
            user.pk,
            'admin' if should_be_admin else 'regular',
        )

    def _should_be_admin(self, normalized_email: str, payload: Dict[str, Any]) -> bool:
        admin_emails = self._env_set('SUPABASE_ADMIN_EMAILS', lower=True)
        if normalized_email and normalized_email.lower() in admin_emails:
            return True

        admin_roles = self._env_set('SUPABASE_ADMIN_ROLES', lower=True)
        if not admin_roles:
            return False

        roles = self._extract_roles(payload)
        return bool(admin_roles.intersection(roles))

    def _extract_roles(self, payload: Dict[str, Any]) -> Set[str]:
        roles: Set[str] = set()
        metadata = payload.get('app_metadata') or {}
        claims_roles = metadata.get('roles') or metadata.get('role')
        payload_role = payload.get('role')

        for value in (claims_roles, payload_role):
            if isinstance(value, str):
                roles.add(value.lower())
            elif isinstance(value, (list, tuple, set)):
                roles.update({str(item).lower() for item in value if item})

        if metadata.get('claims_admin') is True:
            roles.add('admin')

        return roles

    def _extract_full_name(self, payload: Dict[str, Any]) -> str:
        user_metadata = payload.get('user_metadata') or {}
        full_name = user_metadata.get('full_name') or user_metadata.get('fullname') or payload.get('name')
        if isinstance(full_name, str):
            return full_name.strip()
        return ''

    def _build_username(self, seed: str) -> str:
        base = (seed or 'user').split('@')[0]
        filtered = ''.join(ch for ch in base if ch.isalnum() or ch in ('.', '-', '_')).lower() or 'user'
        filtered = filtered[:150]
        candidate = filtered
        suffix = 1
        while User.objects.filter(username=candidate).exists():
            suffix += 1
            trimmed = filtered[: max(1, 150 - len(str(suffix)))]
            candidate = f"{trimmed}{suffix}"
        return candidate

    def _normalize_email(self, email: Optional[str]) -> str:
        if not email:
            return ''
        return User.objects.normalize_email(email)

    @staticmethod
    def _env_list(name: str, *, default: str = '') -> Tuple[str, ...]:
        raw = os.environ.get(name, default)
        parts = [item.strip() for item in raw.split(',') if item.strip()]
        return tuple(parts)

    @staticmethod
    def _env_set(name: str, *, lower: bool = False) -> Set[str]:
        values = set()
        raw = os.environ.get(name, '')
        for item in raw.split(','):
            val = item.strip()
            if not val:
                continue
            values.add(val.lower() if lower else val)
        return values

    @staticmethod
    def _get_leeway() -> int:
        try:
            return int(os.environ.get('SUPABASE_JWT_LEEWAY', '30'))
        except ValueError:
            return 30

