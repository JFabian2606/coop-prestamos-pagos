# ⚡ Solución Rápida: Error de Migraciones en Render

## 🔴 Error

```
InconsistentMigrationHistory: Migration admin.0001_initial is applied before 
its dependency usuarios.0001_initial
```

## ✅ Solución Rápida

### Opción 1: Resetear Migraciones en Supabase (Si es BD nueva)

Ejecuta en **Supabase SQL Editor**:

```sql
-- Eliminar todas las migraciones aplicadas
TRUNCATE TABLE django_migrations;
```

Luego Render aplicará todas las migraciones desde cero en orden correcto.

### Opción 2: Marcar Migraciones como No Aplicadas

Ejecuta en **Supabase SQL Editor**:

```sql
-- Eliminar solo las migraciones problemáticas
DELETE FROM django_migrations WHERE app IN ('admin', 'auth', 'contenttypes', 'sessions', 'socios');
```

### Opción 3: Usar --fake-initial (Ya implementado)

El `render.yaml` ya está actualizado para usar `--fake-initial`. Si el error persiste:

1. Ve a Render Dashboard
2. Manual Deploy → Clear build cache & deploy
3. O modifica temporalmente el startCommand para usar solo `--fake`:

```yaml
startCommand: |
  cd backend && \
  python manage.py migrate --fake-initial && \
  gunicorn core.wsgi:application --bind 0.0.0.0:$PORT
```

## 🎯 Recomendación

**Si es una BD nueva o de desarrollo:**
- Usa Opción 1 (TRUNCATE django_migrations)

**Si ya tienes datos:**
- Usa Opción 2 (DELETE solo las problemáticas)
- O modifica el startCommand para usar `--fake-initial`

## 📝 Verificar en Supabase

```sql
-- Ver migraciones aplicadas
SELECT * FROM django_migrations ORDER BY applied;

-- Ver si existe la tabla usuarios
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'usuario'
);
```

