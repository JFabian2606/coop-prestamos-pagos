import logging

from django.conf import settings

try:
    import resend  # type: ignore
except Exception:  # pragma: no cover - fallback si no esta instalado
    resend = None

log = logging.getLogger(__name__)


def send_mail(to: str, subject: str, html: str) -> bool:
    """Envio simple via Resend. Devuelve True si intento enviar."""
    if not to or not settings.RESEND_API_KEY:
        return False
    if resend is None:
        log.warning("Resend no instalado; no se envio correo a %s", to)
        return False
    try:
        resend.api_key = settings.RESEND_API_KEY
        resend.Emails.send({
            "from": getattr(settings, "NOTIFY_FROM", "onboarding@resend.dev"),
            "to": [to],
            "subject": subject,
            "html": html,
        })
        return True
    except Exception:
        log.exception("No se pudo enviar correo a %s", to)
        return False
