"""
Endpoints de autenticacion: login, registro y utilidades de seguridad.
"""
from datetime import date

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.views import PasswordResetView
from django.middleware.csrf import get_token
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from apps.socios.models import Socio
from apps.usuarios.models import Rol

User = get_user_model()


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def registro(request):
    """
    Registra un nuevo usuario en la tabla 'usuario' de nuestra BD.
    Crea un Socio asociado si no existe.
    """
    email = request.data.get("email")
    password = request.data.get("password")
    nombres = request.data.get("nombres") or request.data.get("nombreCompleto")
    documento = request.data.get("documento") or email  # usa email como fallback
    fecha_alta = request.data.get("fecha_alta") or date.today()

    if not email or not password:
        return Response({"error": "Email y password son obligatorios"}, status=status.HTTP_400_BAD_REQUEST)

    if not nombres:
        return Response({"error": "Nombres son obligatorios"}, status=status.HTTP_400_BAD_REQUEST)

    if not documento:
        return Response({"error": "Documento es obligatorio"}, status=status.HTTP_400_BAD_REQUEST)

    if User.objects.filter(email=email).exists():
        return Response({"error": "Este email ya esta registrado"}, status=status.HTTP_400_BAD_REQUEST)

    rol_socio, _ = Rol.objects.get_or_create(nombre="SOCIO")

    try:
        usuario = User.objects.create_user(
            email=email,
            password=password,
            nombres=nombres,
            activo=True,
            rol=rol_socio,
        )

        if not hasattr(usuario, "socio"):
            Socio.objects.create(
                usuario=usuario,
                nombre_completo=nombres,
                documento=documento,
                estado=Socio.ESTADO_ACTIVO,
                fecha_alta=fecha_alta,
            )
        else:
            Socio.objects.filter(pk=usuario.socio.pk).update(
                nombre_completo=nombres,
                documento=documento,
                fecha_alta=fecha_alta,
            )

        return Response(
            {"message": "Usuario registrado exitosamente", "usuario_id": str(usuario.id), "email": usuario.email},
            status=status.HTTP_201_CREATED,
        )

    except Exception as exc:
        return Response({"error": f"Error al crear usuario: {str(exc)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def login(request):
    """
    Autentica un usuario y retorna informacion de sesion.
    Usa autenticacion de Django (email + password).
    """
    email = request.data.get("email")
    password = request.data.get("password")

    if not email or not password:
        return Response({"error": "Email y password son obligatorios"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(email=email)
        if not user.check_password(password):
            return Response({"error": "Credenciales invalidas"}, status=status.HTTP_401_UNAUTHORIZED)
    except User.DoesNotExist:
        return Response({"error": "Credenciales invalidas"}, status=status.HTTP_401_UNAUTHORIZED)

    if not user.activo:
        return Response({"error": "Usuario inactivo"}, status=status.HTTP_403_FORBIDDEN)

    from django.contrib.auth import login as django_login

    django_login(request, user)

    return Response(
        {
            "message": "Login exitoso",
            "usuario": {
                "id": str(user.id),
                "email": user.email,
                "nombres": user.nombres,
                "rol": user.rol.nombre if user.rol else None,
            },
            "session_id": request.session.session_key,
        },
        status=status.HTTP_200_OK,
    )


@api_view(["POST", "GET"])
@permission_classes([permissions.IsAuthenticated])
def logout(request):
    """
    Cierra la sesion del usuario actual (acepta POST o GET para mayor compatibilidad).
    """
    from django.contrib.auth import logout as django_logout

    django_logout(request)
    return Response({"message": "Logout exitoso"}, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
@ensure_csrf_cookie
def csrf_token(_request):
    """
    Devuelve un OK y fuerza el seteo de la cookie CSRF (csrftoken) para clientes JS.
    """
    token = get_token(_request)
    return Response({"detail": "ok", "csrfToken": token}, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def usuario_actual(request):
    """
    Retorna informacion del usuario actualmente autenticado.
    """
    user = request.user
    return Response(
        {
            "id": str(user.id),
            "email": user.email,
            "nombres": user.nombres,
            "rol": user.rol.nombre if user.rol else None,
            "activo": user.activo,
        },
        status=status.HTTP_200_OK,
    )


class CustomPasswordResetView(PasswordResetView):
    """
    Password reset que permite apuntar el enlace al dominio del frontend.
    """

    email_template_name = "registration/password_reset_email.html"
    subject_template_name = "registration/password_reset_subject.txt"

    def get_extra_email_context(self):
        extra = super().get_extra_email_context() or {}
        frontend_reset_url = getattr(settings, "FRONTEND_RESET_URL", None)
        if frontend_reset_url:
            extra["frontend_reset_url"] = frontend_reset_url.rstrip("/")
        return extra
