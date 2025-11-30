# 🔧 Solución: Usuarios Existentes con Modelo Anterior

## 🔍 Problema

Tienes usuarios registrados con el modelo anterior (`auth_user` de Django) y ahora estás usando `usuarios.Usuario`. Esto causa conflictos en las migraciones.

## ✅ Soluciones (Elige una)

### Opción 1: Eliminar Todo y Empezar de Cero (Recomendado si es BD de desarrollo)

**En Supabase SQL Editor, ejecuta:**

```sql
-- 1. Eliminar todas las migraciones de Django
TRUNCATE TABLE django_migrations;

-- 2. Eliminar tabla auth_user (si existe y no necesitas esos usuarios)
DROP TABLE IF EXISTS auth_user CASCADE;

-- 3. Eliminar otras tablas de Django que puedan causar conflictos
DROP TABLE IF EXISTS django_admin_log CASCADE;
DROP TABLE IF EXISTS django_session CASCADE;
DROP TABLE IF EXISTS auth_user_groups CASCADE;
DROP TABLE IF EXISTS auth_user_user_permissions CASCADE;
```

**Luego redespliega en Render.** Django creará todo desde cero.

---

### Opción 2: Solo Eliminar Migraciones (Si necesitas mantener datos)

**En Supabase SQL Editor:**

```sql
-- Eliminar solo las migraciones problemáticas
DELETE FROM django_migrations 
WHERE app IN ('admin', 'auth', 'contenttypes', 'sessions', 'socios');
```

**Luego redespliega en Render.** Django aplicará las migraciones en orden correcto.

---

### Opción 3: Migrar Usuarios Manualmente (Si necesitas conservar datos)

Si tienes usuarios importantes en `auth_user` que necesitas migrar:

**1. Ver usuarios existentes:**
```sql
SELECT id, username, email, first_name, last_name, is_staff, is_superuser
FROM auth_user;
```

**2. Crear usuarios en la nueva tabla `usuario`:**
```sql
-- Obtener rol SOCIO
INSERT INTO rol (nombre) VALUES ('SOCIO') ON CONFLICT DO NOTHING;
INSERT INTO rol (nombre) VALUES ('ADMIN') ON CONFLICT DO NOTHING;

-- Migrar usuarios (ejemplo - ajusta según tu caso)
-- Necesitarás generar UUIDs y hashes de contraseña
```

**3. Eliminar tabla auth_user:**
```sql
DROP TABLE auth_user CASCADE;
```

**4. Eliminar migraciones:**
```sql
DELETE FROM django_migrations WHERE app IN ('admin', 'auth', 'contenttypes', 'sessions');
```

---

## 🎯 Recomendación

**Si es una BD de desarrollo/prueba:**
- Usa **Opción 1** (eliminar todo y empezar de cero)

**Si es producción y necesitas datos:**
- Usa **Opción 2** (solo eliminar migraciones)
- O **Opción 3** (migrar datos manualmente)

---

## 📝 Pasos Después de Elegir Opción

1. **Ejecutar SQL en Supabase** (según la opción elegida)
2. **Redesplegar en Render:**
   - Render Dashboard → Tu servicio
   - Manual Deploy → Clear build cache & deploy
3. **Verificar logs** - Deberías ver migraciones aplicándose correctamente
4. **Probar registro** - Crear un nuevo usuario para verificar que funciona

---

## 🔍 Verificar Estado Actual

**En Supabase SQL Editor:**

```sql
-- Ver si existe auth_user
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'auth_user'
);

-- Ver usuarios en auth_user (si existe)
SELECT COUNT(*) FROM auth_user;

-- Ver migraciones aplicadas
SELECT app, name, applied 
FROM django_migrations 
ORDER BY applied DESC;
```

---

## ⚠️ Importante

- **Backup antes de eliminar datos** si es producción
- **Verifica qué datos necesitas conservar**
- **El Procfile ya está actualizado** para manejar este caso

