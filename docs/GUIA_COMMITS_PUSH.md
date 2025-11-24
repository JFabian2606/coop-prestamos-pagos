# 📝 Guía: Commits y Push para Kanban

## 🎯 Resumen de Cambios para Kanban

### ✅ Tareas Completadas

1. **Unificar sistema de usuarios**
   - Eliminada redundancia entre `auth_user` (Django) y `usuario` (Supabase)
   - Creado modelo `Usuario` personalizado
   - Relación directa `socio.usuario_id → usuario.id`

2. **Implementar autenticación propia**
   - Eliminada dependencia de Supabase Auth
   - Endpoints propios: `/api/auth/registro/`, `/api/auth/login/`, `/api/auth/logout/`
   - Frontend actualizado para usar autenticación propia

3. **Registro automático de socios**
   - Signal que crea `Socio` automáticamente
   - Asignación automática de rol SOCIO
   - Creación automática al registrarse

4. **Optimizar estructura de BD**
   - Esquema simplificado con `rol_id` directo
   - Tabla `auditoria` genérica
   - Índices optimizados

5. **Configurar despliegue**
   - `render.yaml` actualizado
   - `Procfile` actualizado
   - Variables de entorno documentadas

## 📦 Estructura de Commits

### Opción 1: Commits Organizados (Recomendado)

```bash
# 1. Unificación de usuarios
git add backend/apps/usuarios/ backend/core/settings.py backend/apps/socios/models.py
git commit -m "feat: Unificar sistema de usuarios - Eliminar redundancia auth_user/usuario"

# 2. Autenticación propia
git add backend/apps/usuarios/views.py backend/apps/usuarios/urls.py backend/core/urls.py
git add frontend/src/api.ts frontend/src/components/LoginRegistro.tsx frontend/src/App.tsx
git commit -m "feat: Implementar autenticación propia - Reemplazar Supabase Auth"

# 3. Registro automático
git add backend/apps/usuarios/signals.py backend/apps/usuarios/apps.py backend/apps/socios/auth.py
git commit -m "feat: Registro automático de socios con asignación de rol SOCIO"

# 4. Comandos y utilidades
git add backend/apps/usuarios/management/
git commit -m "feat: Comando CLI para crear usuarios"

# 5. Esquema BD
git add docs/base-de-datos/schema_postgresql_simplificado.sql docs/base-de-datos/scripts_insertar_usuario.sql
git commit -m "docs: Actualizar esquema de base de datos simplificado"

# 6. Despliegue
git add render.yaml Procfile docs/DESPLIEGUE_PRODUCCION.md docs/CHECKLIST_DESPLIEGUE.md
git commit -m "feat: Configurar despliegue en Render y Vercel"

# 7. Documentación
git add docs/
git commit -m "docs: Agregar documentación completa del proyecto"
```

### Opción 2: Commit Único (Rápido)

```bash
git add .
git commit -m "feat: Unificar usuarios, autenticación propia y despliegue

- Unificar sistema de usuarios (eliminar redundancia auth_user/usuario)
- Implementar autenticación propia sin Supabase Auth
- Registro automático de socios con rol SOCIO
- Configurar despliegue en Render y Vercel
- Actualizar esquema de base de datos
- Agregar comandos de gestión y documentación completa"
```

## 🚀 Push al Repositorio

```bash
# Verificar rama actual
git branch

# Push a la rama principal
git push origin main
# o
git push origin master

# Si es la primera vez, puede necesitar:
git push -u origin main
```

## 📋 Actualizar Kanban

### Tareas para Mover a "Done" ✅

1. **Unificar sistema de usuarios**
   - Descripción: Eliminar redundancia entre auth_user y usuario
   - Estado: ✅ Completado

2. **Implementar autenticación propia**
   - Descripción: Reemplazar Supabase Auth con autenticación Django
   - Estado: ✅ Completado

3. **Registro automático de socios**
   - Descripción: Crear socio automáticamente al registrarse
   - Estado: ✅ Completado

4. **Optimizar estructura de BD**
   - Descripción: Simplificar relaciones y roles
   - Estado: ✅ Completado

5. **Configurar despliegue**
   - Descripción: Preparar para Vercel y Render
   - Estado: ✅ Completado

### Nueva Tarea: Despliegue en Producción 🚧

- Descripción: Desplegar backend en Render y frontend en Vercel
- Estado: 🚧 En progreso
- Notas: Configuración lista, falta ejecutar despliegue

## 📝 Notas para el Commit

**Cambios principales:**
- ✅ Sistema unificado de usuarios (una sola tabla)
- ✅ Autenticación propia (sin Supabase Auth)
- ✅ Registro automático de socios
- ✅ Esquema de BD optimizado
- ✅ Configuración de despliegue lista

**Archivos nuevos:**
- `backend/apps/usuarios/` (app completa)
- `docs/DESPLIEGUE_PRODUCCION.md`
- `docs/CHECKLIST_DESPLIEGUE.md`
- `docs/COMMITS_ORGANIZADOS.md`

**Archivos modificados:**
- `backend/core/settings.py`
- `backend/apps/socios/models.py`
- `frontend/src/api.ts`
- `frontend/src/components/LoginRegistro.tsx`
- `render.yaml`
- `Procfile`

