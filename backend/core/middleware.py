import logging
import os

from django.contrib.auth import get_user_model
from django.utils.deprecation import MiddlewareMixin

logger = logging.getLogger(__name__)
User = get_user_model()


class ApiKeyAuthMiddleware(MiddlewareMixin):
    """
    Autentica peticiones server-to-server (n8n, automatizaciones) usando una API key simple.
    - Si el header X-API-Key coincide con SERVICE_API_KEY, se autentica como un usuario "bot".
    - Salta la validación CSRF para estas peticiones.
    """

    def process_request(self, request):
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
            if not user.activo:
                updates["activo"] = True

        if updates:
            for field, value in updates.items():
                setattr(user, field, value)
            user.save(update_fields=list(updates.keys()))

        request.user = user
        request._dont_enforce_csrf_checks = True
        return None
