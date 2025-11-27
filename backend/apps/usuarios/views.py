"""
Endpoints de autenticación: Login y Registro
"""
from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import authenticate
from django.contrib.auth import get_user_model
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.urls import reverse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.csrf import ensure_csrf_cookie
from django.middleware.csrf import get_token
from apps.usuarios.models import Rol
from apps.socios.models import Socio
from datetime import date
from apps.usuarios.tokens import (
    TokenVerificacionExpirado,
    TokenVerificacionInvalido,
    generar_token_verificacion,
    validar_token_verificacion,
)

User = get_user_model()


def _enviar_correo_verificacion(usuario, request):
    token = generar_token_verificacion(usuario)
    url = request.build_absolute_uri(reverse('confirmar-email')) + f'?token={token}'
    asunto = 'Confirma tu cuenta'
    texto = (
        f'Hola {usuario.nombres},\n\n'
        'Confirma tu correo para activar tu cuenta de la cooperativa:\n'
        f'{url}\n\n'
        'Si no creaste esta cuenta, ignora este mensaje.'
    )
    html = f"""<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Confirmación de correo - Cooprestamos</title>
  </head>
  <body style="font-family: 'Inter', 'Montserrat', Arial, sans-serif; background-color: #f5f7fa; color: #03271b; margin: 0; padding: 0;">
    <div style="max-width: 600px; margin: 30px auto; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08); overflow: hidden;">
      <div style="background: #ffffff; text-align: center; padding: 24px 20px;">
        <h1 style="margin: 0; color: #41A69E; font-size: 22px;">Cooprestamos</h1>
      </div>
      <div style="padding: 30px 25px; line-height: 1.6;">
        <h2 style="color: #41A69E; font-size: 20px; margin-bottom: 12px;">¡Hola, {usuario.nombres}! 💚</h2>
        <p style="font-size: 15px; margin: 10px 0;">
          Gracias por registrarte en <strong>Cooprestamos</strong>. Antes de continuar, necesitamos confirmar tu correo electrónico para activar tu cuenta.
        </p>
        <p style="font-size: 15px; margin: 10px 0;">
          Haz clic en el siguiente botón para verificar tu dirección y acceder a todas las funciones de tu cuenta:
        </p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="{url}" style="display: inline-block; background-color: #41A69E; color: #ffffff; text-decoration: none; font-weight: 600; padding: 12px 24px; border-radius: 8px; font-size: 15px;">
            Confirmar mi correo
          </a>
        </div>
        <p style="font-size: 15px; margin: 20px 0 10px 0;">
          Si tú no creaste esta cuenta, simplemente ignora este mensaje. 💫
        </p>
        <p style="font-size: 15px; margin: 10px 0;">¡Nos alegra tenerte como parte de la cooperativa! 🤝</p>
      </div>
      <div style="background-color: #f0f3f7; text-align: center; padding: 20px; font-size: 13px; color: #5a5a5a;">
        <p style="margin: 0;">
          Este mensaje fue enviado por <strong>Cooprestamos</strong>.<br />
          Sistema de Gestión de Préstamos y Pagos para Cooperativas — 2025
        </p>
        <p style="margin: 10px 0 0 0;">
          <a href="https://github.com/JFabian2606/coop-prestamos-pagos" style="color: #1a59c8; text-decoration: none;">
            Visitar repositorio del proyecto
          </a>
        </p>
      </div>
    </div>
  </body>
</html>
"""
    mensaje = EmailMultiAlternatives(
        asunto,
        texto,
        settings.DEFAULT_FROM_EMAIL,
        [usuario.email],
    )
    mensaje.attach_alternative(html, "text/html")
    mensaje.send(fail_silently=False)

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def registro(request):
    """
    Registra un nuevo usuario en la tabla 'usuario' de nuestra BD.
    Automáticamente crea un Socio asociado.
    """
    email = request.data.get('email')
    password = request.data.get('password')
    nombres = request.data.get('nombres') or request.data.get('nombreCompleto')
    documento = request.data.get('documento') or email  # usa email como fallback
    fecha_alta = request.data.get('fecha_alta') or date.today()
    
    if not email or not password:
        return Response(
            {'error': 'Email y password son obligatorios'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if not nombres:
        return Response(
            {'error': 'Nombres son obligatorios'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if not documento:
        return Response(
            {'error': 'Documento es obligatorio'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Verificar que el email no exista
    if User.objects.filter(email=email).exists():
        return Response(
            {'error': 'Este email ya está registrado'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Obtener o crear rol SOCIO
    rol_socio, _ = Rol.objects.get_or_create(nombre='SOCIO')
    
    # Crear usuario
    try:
        usuario = User.objects.create_user(
            email=email,
            password=password,
            nombres=nombres,
            activo=False,
            email_verificado=False,
            email_verificado_en=None,
            rol=rol_socio,
        )
        
        # El signal automáticamente creará el Socio
        # Pero verificamos por si acaso
        if not hasattr(usuario, 'socio'):
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
        _enviar_correo_verificacion(usuario, request)

        return Response({
            'message': 'Usuario registrado exitosamente. Revisa tu email para activar la cuenta.',
            'usuario_id': str(usuario.id),
            'email': usuario.email,
            'requiere_verificacion': True,
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        return Response(
            {'error': f'Error al crear usuario: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST', 'GET'])
@permission_classes([permissions.AllowAny])
def confirmar_email(request):
    """
    Valida el token de verificación enviado al email y activa la cuenta.
    """
    token = request.data.get('token') or request.query_params.get('token')
    if not token:
        return Response({'error': 'Token de verificación requerido'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        payload = validar_token_verificacion(token)
    except TokenVerificacionExpirado:
        return Response({'error': 'Token expirado'}, status=status.HTTP_400_BAD_REQUEST)
    except TokenVerificacionInvalido:
        return Response({'error': 'Token inválido'}, status=status.HTTP_400_BAD_REQUEST)

    user = User.objects.filter(pk=payload.get('user_id'), email=payload.get('email')).first()
    if not user:
        return Response({'error': 'Usuario no encontrado'}, status=status.HTTP_404_NOT_FOUND)

    if user.email_verificado:
        return Response({'message': 'El email ya fue verificado'}, status=status.HTTP_200_OK)

    user.email_verificado = True
    user.email_verificado_en = timezone.now()
    user.activo = True
    user.save(update_fields=['email_verificado', 'email_verificado_en', 'activo', 'is_active'])

    return Response({'message': 'Email verificado correctamente'}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def reenviar_verificacion(request):
    """
    Reenvía el correo de verificación si el usuario aún no lo confirmó.
    """
    email = request.data.get('email')
    if not email:
        return Response({'error': 'Email es obligatorio'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return Response({'error': 'Usuario no encontrado'}, status=status.HTTP_404_NOT_FOUND)

    if user.email_verificado:
        return Response({'message': 'El email ya está verificado'}, status=status.HTTP_200_OK)

    _enviar_correo_verificacion(user, request)
    return Response({'message': 'Correo de verificación enviado'}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def login(request):
    """
    Autentica un usuario y retorna información de sesión.
    Usa autenticación de Django (email + password).
    """
    email = request.data.get('email')
    password = request.data.get('password')
    
    if not email or not password:
        return Response(
            {'error': 'Email y password son obligatorios'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Autenticar usuario (Usuario usa email como USERNAME_FIELD)
    try:
        user = User.objects.get(email=email)
        if not user.check_password(password):
            return Response(
                {'error': 'Credenciales inválidas'},
                status=status.HTTP_401_UNAUTHORIZED
            )
    except User.DoesNotExist:
        return Response(
            {'error': 'Credenciales inválidas'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    if not user.email_verificado:
        return Response(
            {'error': 'Debes confirmar tu email'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    if not user.activo:
        return Response(
            {'error': 'Usuario inactivo'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Retornar información del usuario
    from django.contrib.auth import login as django_login
    django_login(request, user)
    
    return Response({
        'message': 'Login exitoso',
        'usuario': {
            'id': str(user.id),
            'email': user.email,
            'nombres': user.nombres,
            'rol': user.rol.nombre if user.rol else None,
        },
        'session_id': request.session.session_key,
    }, status=status.HTTP_200_OK)


@api_view(['POST', 'GET'])
@permission_classes([permissions.IsAuthenticated])
def logout(request):
    """
    Cierra la sesión del usuario actual (acepta POST o GET para mayor compatibilidad).
    """
    from django.contrib.auth import logout as django_logout
    django_logout(request)
    return Response({'message': 'Logout exitoso'}, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
@ensure_csrf_cookie
def csrf_token(_request):
    """
    Devuelve un OK y fuerza el seteo de la cookie CSRF (csrftoken) para clientes JS.
    """
    token = get_token(_request)
    return Response({'detail': 'ok', 'csrfToken': token}, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def usuario_actual(request):
    """
    Retorna información del usuario actualmente autenticado.
    """
    user = request.user
    return Response({
        'id': str(user.id),
        'email': user.email,
        'nombres': user.nombres,
        'rol': user.rol.nombre if user.rol else None,
        'activo': user.activo,
        'email_verificado': user.email_verificado,
        'email_verificado_en': user.email_verificado_en,
    }, status=status.HTTP_200_OK)
