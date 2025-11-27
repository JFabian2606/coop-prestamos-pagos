"""
Utilidades para tokens de verificación de email.
"""
from django.conf import settings
from django.core import signing


SALT = "email-verification"


class TokenVerificacionError(Exception):
    """Token inválido para verificación de email."""


class TokenVerificacionExpirado(TokenVerificacionError):
    """Token expirado para verificación de email."""


class TokenVerificacionInvalido(TokenVerificacionError):
    """Token inválido o manipulado para verificación de email."""


def generar_token_verificacion(usuario) -> str:
    payload = {"user_id": str(usuario.id), "email": usuario.email}
    return signing.dumps(payload, salt=SALT)


def validar_token_verificacion(token: str) -> dict:
    try:
        return signing.loads(
            token,
            salt=SALT,
            max_age=getattr(settings, "EMAIL_VERIFICATION_MAX_AGE", 60 * 60 * 24),
        )
    except signing.SignatureExpired as exc:
        raise TokenVerificacionExpirado("Token expirado") from exc
    except signing.BadSignature as exc:
        raise TokenVerificacionInvalido("Token inválido") from exc
