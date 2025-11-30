from __future__ import annotations

from typing import Dict, Iterable, Tuple

from django.contrib.auth import get_user_model

from .models import Socio, SocioAuditLog


User = get_user_model()

TRACKED_FIELDS: Tuple[str, ...] = (
    'nombre_completo',
    'documento',
    'telefono',
    'direccion',
    'datos_fiscales',
    'estado',
)


def snapshot_socio(socio: Socio) -> Dict[str, object]:
    return {field: getattr(socio, field) for field in TRACKED_FIELDS}


def _diff(before: Dict[str, object], after: Dict[str, object]) -> Tuple[list, Dict[str, object], Dict[str, object]]:
    changed = []
    prev = {}
    new = {}
    for field in TRACKED_FIELDS:
        if before.get(field) != after.get(field):
            changed.append(field)
            prev[field] = before.get(field)
            new[field] = after.get(field)
    return changed, prev, new


def register_audit_entry(
    *,
    socio: Socio,
    user: User | None,
    action: str,
    before: Dict[str, object],
    after: Dict[str, object],
    metadata: Dict[str, object] | None = None,
) -> SocioAuditLog | None:
    changed_fields, prev, new = _diff(before, after)
    if not changed_fields:
        return None

    return SocioAuditLog.objects.create(
        socio=socio,
        performed_by=user if getattr(user, 'is_authenticated', False) else None,
        action=action,
        estado_anterior=before.get('estado') or '',
        estado_nuevo=after.get('estado') or '',
        campos_modificados=changed_fields,
        datos_previos=prev,
        datos_nuevos=new,
        metadata=metadata or {},
    )
