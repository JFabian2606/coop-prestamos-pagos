"""
Sistema de auditoría genérica para registrar eventos importantes en el sistema.

Esta función complementa las tablas de auditoría específicas (como SocioAuditLog)
registrando eventos importantes en una tabla centralizada para cumplimiento
regulatorio y reportes.
"""
import uuid
from typing import Optional, Dict, Any
from django.db import connection


def register_audit(
    entidad: str,
    entidad_id: uuid.UUID,
    accion: str,
    usuario_id: uuid.UUID,
    payload: Optional[Dict[str, Any]] = None,
) -> None:
    """
    Registra un evento en la tabla de auditoría genérica.
    
    Args:
        entidad: Nombre de la entidad afectada ('prestamo', 'pago', 'solicitud', etc.)
        entidad_id: UUID de la entidad afectada
        accion: Acción realizada ('CREADO', 'MODIFICADO', 'APROBADO', etc.)
        usuario_id: UUID del usuario que realizó la acción
        payload: Datos adicionales relevantes (opcional)
    
    Ejemplo:
        register_audit(
            entidad='prestamo',
            entidad_id=prestamo.id,
            accion='CREADO',
            usuario_id=request.user.id,
            payload={'monto': str(prestamo.monto), 'socio_id': str(prestamo.socio_id)}
        )
    """
    # Usar SQL directo para evitar dependencias circulares
    # y para que funcione incluso si no hay modelos Django definidos
    with connection.cursor() as cursor:
        cursor.execute(
            """
            INSERT INTO public.auditoria 
                (entidad, entidad_id, accion, usuario_id, payload, timestamp)
            VALUES (%s, %s, %s, %s, %s, NOW())
            """,
            [
                entidad,
                str(entidad_id),
                accion,
                str(usuario_id),
                payload or {},
            ],
        )


# Constantes para acciones comunes
class Acciones:
    """Acciones estándar para auditoría"""
    CREADO = 'CREADO'
    MODIFICADO = 'MODIFICADO'
    ELIMINADO = 'ELIMINADO'
    APROBADO = 'APROBADO'
    RECHAZADO = 'RECHAZADO'
    CANCELADO = 'CANCELADO'
    DESEMBOLSADO = 'DESEMBOLSADO'
    REGISTRADO = 'REGISTRADO'
    ANULADO = 'ANULADO'
    REVERSADO = 'REVERSADO'
    ESTADO_CAMBIADO = 'ESTADO_CAMBIADO'


# Constantes para entidades
class Entidades:
    """Nombres de entidades para auditoría"""
    PRESTAMO = 'prestamo'
    PAGO = 'pago'
    SOLICITUD = 'solicitud'
    DESEMBOLSO = 'desembolso'
    SOCIO = 'socio'
    PRODUCTO = 'producto'
    EVALUACION = 'evaluacion'
    DOCUMENTO = 'documento'
    CUOTA = 'cuota'

