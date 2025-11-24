# 🐍 Comandos para Django Shell

## ✅ Uso Correcto del Shell

Cuando estás en el shell de Django (`python manage.py shell`), solo ejecuta código Python, NO comandos de terminal.

### ❌ INCORRECTO:
```python
>>> python manage.py shell  # ❌ Esto es un comando de terminal, no Python
>>> >>> from apps.usuarios.models import Usuario  # ❌ No copies el >>>
```

### ✅ CORRECTO:
```python
>>> from apps.usuarios.models import Usuario
>>> from apps.socios.models import Socio
>>> Usuario.objects.all()
>>> Socio.objects.all()
```

## 📋 Comandos Útiles

### Ver todos los usuarios
```python
from apps.usuarios.models import Usuario
usuarios = Usuario.objects.all()
for u in usuarios:
    print(f"{u.email} - {u.nombres} - {u.rol}")
```

### Ver todos los socios
```python
from apps.socios.models import Socio
socios = Socio.objects.all()
for s in socios:
    print(f"{s.nombre_completo} - {s.estado} - Usuario: {s.usuario.email if s.usuario else 'Sin usuario'}")
```

### Ver usuarios con sus socios
```python
from apps.usuarios.models import Usuario
for usuario in Usuario.objects.select_related('socio'):
    print(f"Usuario: {usuario.email}")
    if hasattr(usuario, 'socio'):
        print(f"  Socio: {usuario.socio.nombre_completo} - {usuario.socio.estado}")
    else:
        print("  Sin socio asociado")
```

### Crear usuario manualmente
```python
from apps.usuarios.models import Usuario, Rol
rol_socio = Rol.objects.get(nombre='SOCIO')
usuario = Usuario.objects.create_user(
    email='test@example.com',
    password='test123',
    nombres='Test User',
    rol=rol_socio
)
print(f"Usuario creado: {usuario.email}")
```

### Contar registros
```python
from apps.usuarios.models import Usuario
from apps.socios.models import Socio
print(f"Usuarios: {Usuario.objects.count()}")
print(f"Socios: {Socio.objects.count()}")
print(f"Socios con usuario: {Socio.objects.filter(usuario__isnull=False).count()}")
```

### Salir del shell
```python
exit()
# o presiona Ctrl+Z y Enter en Windows
```

