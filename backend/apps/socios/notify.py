import logging

from django.conf import settings
from django.core.mail import send_mail as dj_send_mail

log = logging.getLogger(__name__)


def send_mail(to: str, subject: str, html: str) -> bool:
    """
    Envío simple usando el backend SMTP configurado en Django.
    Devuelve True si se intentó enviar.
    """
    remitente = getattr(settings, "DEFAULT_FROM_EMAIL", None) or getattr(settings, "NOTIFY_FROM", None)
    if not to or not remitente:
        return False
    try:
        dj_send_mail(
            subject=subject,
            message="",  # cuerpo plano vacío
            from_email=remitente,
            recipient_list=[to],
            html_message=html,
            fail_silently=False,
        )
        return True
    except Exception:
        log.exception("No se pudo enviar correo a %s", to)
        return False
