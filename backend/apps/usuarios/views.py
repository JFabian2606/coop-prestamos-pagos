"""
Endpoints de autenticación: Login y Registro
"""
from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import authenticate
from django.contrib.auth import get_user_model
from apps.usuarios.models import Rol
from apps.socios.models import Socio
from datetime import date

User = get_user_model()


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
            activo=True,
            rol=rol_socio,
        )
        
        # El signal automáticamente creará el Socio
        # Pero verificamos por si acaso
        if not hasattr(usuario, 'socio'):
            Socio.objects.create(
                usuario=usuario,
                nombre_completo=nombres,
                estado=Socio.ESTADO_ACTIVO,
                fecha_alta=date.today(),
            )
        
        return Response({
            'message': 'Usuario registrado exitosamente',
            'usuario_id': str(usuario.id),
            'email': usuario.email,
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        return Response(
            {'error': f'Error al crear usuario: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


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


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def logout(request):
    """
    Cierra la sesión del usuario actual.
    """
    from django.contrib.auth import logout as django_logout
    django_logout(request)
    return Response({'message': 'Logout exitoso'}, status=status.HTTP_200_OK)


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
    }, status=status.HTTP_200_OK)

