import os
from typing import Optional, Tuple

from django.contrib.auth import get_user_model
from rest_framework import authentication

User = get_user_model()


class ApiKeyAuthentication(authentication.BaseAuthentication):
    """
    Autenticación por API key para integraciones server-to-server (n8n, cron).
    Si el header X-API-Key coincide con SERVICE_API_KEY, autentica como un usuario bot.
    """

    def authenticate(self, request) -> Optional[Tuple[User, None]]:
        expected = os.environ.get("SERVICE_API_KEY")
        if not expected:
            return None

        key = request.headers.get("X-API-Key")
        if key != expected:
            return None

        email = os.environ.get("SERVICE_USER_EMAIL", "bot@coop.local")
        nombres = os.environ.get("SERVICE_USER_NAME", "Bot Automatizaciones")[:255]
        defaults = {"nombres": nombres, "is_staff": True, "activo": True}

        user, created = User.objects.get_or_create(email=email, defaults=defaults)
        updates = {}
        if not created:
            if not user.is_staff:
                updates["is_staff"] = True
            if not getattr(user, "activo", True):
                updates["activo"] = True

        if updates:
            for field, value in updates.items():
                setattr(user, field, value)
            user.save(update_fields=list(updates.keys()))

        return (user, None)
