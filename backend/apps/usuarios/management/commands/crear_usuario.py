"""
Comando de Django para crear usuarios en la tabla 'usuario' de Supabase.

Uso:
    python manage.py crear_usuario --email admin@example.com --nombres "Admin User" --rol ADMIN
    python manage.py crear_usuario --email socio@example.com --nombres "Socio User" --rol SOCIO --password mi_password
"""
from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from apps.usuarios.models import Rol

User = get_user_model()


class Command(BaseCommand):
    help = 'Crea un usuario en la tabla usuario de Supabase'

    def add_arguments(self, parser):
        parser.add_argument(
            '--email',
            type=str,
            required=True,
            help='Email del usuario (obligatorio)',
        )
        parser.add_argument(
            '--nombres',
            type=str,
            required=True,
            help='Nombres completos del usuario (obligatorio)',
        )
        parser.add_argument(
            '--rol',
            type=str,
            default='SOCIO',
            choices=['SOCIO', 'ADMIN', 'ANALISTA', 'TESORERO', 'CAJERO'],
            help='Rol del usuario (default: SOCIO)',
        )
        parser.add_argument(
            '--password',
            type=str,
            help='Password del usuario (opcional, si no se proporciona se genera uno aleatorio)',
        )
        parser.add_argument(
            '--activo',
            action='store_true',
            default=True,
            help='Usuario activo (default: True)',
        )
        parser.add_argument(
            '--inactivo',
            action='store_true',
            help='Crear usuario inactivo',
        )
        parser.add_argument(
            '--superuser',
            action='store_true',
            help='Crear como superusuario',
        )
        parser.add_argument(
            '--staff',
            action='store_true',
            help='Crear como staff (admin)',
        )

    def handle(self, *args, **options):
        email = options['email']
        nombres = options['nombres']
        rol_nombre = options['rol']
        password = options.get('password')
        activo = options['activo'] and not options['inactivo']
        is_superuser = options.get('superuser', False)
        is_staff = options.get('staff', False) or is_superuser

        # Validar que el email no exista
        if User.objects.filter(email=email).exists():
            raise CommandError(f'El usuario con email {email} ya existe.')

        # Obtener o crear rol
        try:
            rol = Rol.objects.get(nombre=rol_nombre)
        except Rol.DoesNotExist:
            self.stdout.write(
                self.style.WARNING(f'Rol {rol_nombre} no existe. Creándolo...')
            )
            rol = Rol.objects.create(nombre=rol_nombre)
            self.stdout.write(
                self.style.SUCCESS(f'Rol {rol_nombre} creado exitosamente.')
            )

        # Crear usuario
        try:
            user = User.objects.create_user(
                email=email,
                password=password,
                nombres=nombres,
                activo=activo,
                rol=rol,
                is_staff=is_staff,
                is_superuser=is_superuser,
            )

            self.stdout.write(
                self.style.SUCCESS(
                    f'Usuario creado exitosamente:\n'
                    f'  ID: {user.id}\n'
                    f'  Email: {user.email}\n'
                    f'  Nombres: {user.nombres}\n'
                    f'  Rol: {rol.nombre}\n'
                    f'  Activo: {user.activo}\n'
                    f'  Staff: {user.is_staff}\n'
                    f'  Superuser: {user.is_superuser}'
                )
            )

            if password:
                self.stdout.write(
                    self.style.SUCCESS(f'Password configurado: {password}')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(
                        'No se proporcionó password. El usuario necesitará usar Supabase Auth o resetear password.'
                    )
                )

        except Exception as e:
            raise CommandError(f'Error al crear usuario: {str(e)}')

