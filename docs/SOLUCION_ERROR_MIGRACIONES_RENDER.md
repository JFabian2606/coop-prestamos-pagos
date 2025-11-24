# 🔧 Solución: Error de Migraciones en Render

## ❌ Error

```
InconsistentMigrationHistory: Migration admin.0001_initial is applied before 
its dependency usuarios.0001_initial on database 'default'.
```

## 🔍 Causa

Las migraciones de Django Admin ya están aplicadas en la BD de producción con el modelo de usuario antiguo (`auth.User`), pero ahora dependen de `usuarios.Usuario`.

## ✅ Soluciones

### Opción 1: Marcar Migraciones como No Aplicadas (Recomendado para Producción Nueva)

Si es una BD nueva o puedes resetear:

```sql
-- En Supabase SQL Editor
-- Eliminar registros de migraciones aplicadas
DELETE FROM django_migrations WHERE app = 'admin';
DELETE FROM django_migrations WHERE app = 'auth';
DELETE FROM django_migrations WHERE app = 'contenttypes';
DELETE FROM django_migrations WHERE app = 'sessions';
DELETE FROM django_migrations WHERE app = 'socios';
```

Luego en Render, las migraciones se aplicarán en orden correcto.

### Opción 2: Aplicar Migraciones Manualmente en Orden

Modificar el `startCommand` en Render para aplicar migraciones en orden:

```yaml
startCommand: |
  cd backend && \
  python manage.py migrate usuarios --fake-initial && \
  python manage.py migrate contenttypes --fake-initial && \
  python manage.py migrate auth --fake-initial && \
  python manage.py migrate admin --fake-initial && \
  python manage.py migrate socios && \
  python manage.py migrate && \
  gunicorn core.wsgi:application --bind 0.0.0.0:$PORT
```

### Opción 3: Script de Migración Manual

Crear un script que maneje las migraciones:

```python
# backend/scripts/fix_migrations.py
from django.core.management import execute_from_command_line
import sys

if __name__ == '__main__':
    # Aplicar migraciones en orden correcto
    execute_from_command_line(['manage.py', 'migrate', 'usuarios', '--fake-initial'])
    execute_from_command_line(['manage.py', 'migrate', 'contenttypes', '--fake-initial'])
    execute_from_command_line(['manage.py', 'migrate', 'auth', '--fake-initial'])
    execute_from_command_line(['manage.py', 'migrate', 'admin', '--fake-initial'])
    execute_from_command_line(['manage.py', 'migrate', 'socios'])
    execute_from_command_line(['manage.py', 'migrate'])
```

### Opción 4: Usar --fake (Solo si las tablas ya existen)

Si las tablas ya existen en Supabase:

```yaml
startCommand: |
  cd backend && \
  python manage.py migrate --fake-initial && \
  gunicorn core.wsgi:application --bind 0.0.0.0:$PORT
```

## 🎯 Solución Recomendada

Para Render, modifica el `startCommand` en `render.yaml`:

```yaml
startCommand: |
  cd backend && \
  python manage.py migrate usuarios --fake-initial || true && \
  python manage.py migrate contenttypes --fake-initial || true && \
  python manage.py migrate auth --fake-initial || true && \
  python manage.py migrate admin --fake-initial || true && \
  python manage.py migrate socios --fake-initial || true && \
  python manage.py migrate || true && \
  gunicorn core.wsgi:application --bind 0.0.0.0:$PORT
```

El `|| true` permite que continúe aunque falle alguna migración.

## ⚠️ Si la BD ya tiene datos

Si ya tienes datos en producción, necesitas:

1. **Backup de datos** antes de hacer cambios
2. **Migración de datos** de `auth_user` a `usuario`
3. **Actualizar referencias** en otras tablas

## 🔄 Alternativa: Resetear Migraciones en Supabase

Si es una BD nueva o de desarrollo:

```sql
-- En Supabase SQL Editor
TRUNCATE TABLE django_migrations;
```

Luego las migraciones se aplicarán desde cero en orden correcto.

