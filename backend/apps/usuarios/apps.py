from django.apps import AppConfig


class UsuariosConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.usuarios'
    
    def ready(self):
        """Importa signals cuando la app está lista"""
        import apps.usuarios.signals  # noqa

