# 📋 Tareas para Actualizar en Kanban

## ✅ Tareas Completadas - Mover a "Done"

### 1. **Unificar sistema de usuarios**
**Descripción:** Eliminar redundancia entre `auth_user` (Django) y `usuario` (Supabase)

**Cambios realizados:**
- ✅ Creado modelo `Usuario` personalizado que usa tabla `usuario` de Supabase
- ✅ Implementado `rol_id` directo en tabla `usuario` (simplificado)
- ✅ Actualizado modelo `Socio` para usar `usuario_id` directamente
- ✅ Configurado `AUTH_USER_MODEL = 'usuarios.Usuario'`

**Commits relacionados:**
- `feat: Unificar sistema de usuarios - Eliminar redundancia auth_user/usuario`

---

### 2. **Implementar autenticación propia**
**Descripción:** Reemplazar Supabase Auth con autenticación propia de Django

**Cambios realizados:**
- ✅ Creados endpoints propios: `/api/auth/registro/`, `/api/auth/login/`, `/api/auth/logout/`
- ✅ Implementado SessionAuthentication de Django
- ✅ Actualizado frontend para usar endpoints propios
- ✅ Configurado CORS para cookies

**Commits relacionados:**
- `feat: Implementar autenticación propia - Reemplazar Supabase Auth`

---

### 3. **Registro automático de socios**
**Descripción:** Crear socio automáticamente cuando un usuario se registra

**Cambios realizados:**
- ✅ Signal que crea `Socio` automáticamente al registrar usuario con rol SOCIO
- ✅ Asignación automática de rol SOCIO a nuevos usuarios
- ✅ Creación automática de socio con estado ACTIVO

**Commits relacionados:**
- `feat: Registro automático de socios con asignación de rol SOCIO`

---

### 4. **Optimizar estructura de base de datos**
**Descripción:** Simplificar relaciones y roles en la base de datos

**Cambios realizados:**
- ✅ Esquema PostgreSQL simplificado con `rol_id` directo
- ✅ Tabla `auditoria` genérica con índices optimizados
- ✅ Scripts para insertar usuarios y roles

**Commits relacionados:**
- `docs: Actualizar esquema de base de datos simplificado`

---

### 5. **Configurar despliegue en producción**
**Descripción:** Preparar configuración para Vercel (frontend) y Render (backend)

**Cambios realizados:**
- ✅ `render.yaml` actualizado con comandos correctos
- ✅ `Procfile` actualizado para producción
- ✅ Variables de entorno documentadas
- ✅ CORS y seguridad configurados para producción

**Commits relacionados:**
- `feat: Configurar despliegue en Render y Vercel`

---

## 🚧 Nueva Tarea: Despliegue en Producción

**Descripción:** Desplegar backend en Render y frontend en Vercel

**Estado:** 🚧 En progreso / 📝 Pendiente

**Pasos:**
1. Configurar servicio en Render
2. Configurar proyecto en Vercel
3. Ejecutar migraciones en Supabase
4. Probar registro/login en producción
5. Crear usuario admin en producción

---

## 📊 Resumen de Commits

1. ✅ `feat: Unificar sistema de usuarios`
2. ✅ `feat: Implementar autenticación propia`
3. ✅ `feat: Registro automático de socios`
4. ✅ `feat: Comando CLI y utilidades`
5. ✅ `docs: Actualizar esquema de base de datos`
6. ✅ `feat: Configurar despliegue`
7. ✅ `docs: Agregar documentación completa`

**Total:** 7 commits organizados

---

## 🎯 Próximos Pasos

1. **Hacer push de los commits**
2. **Actualizar Kanban** con tareas completadas
3. **Desplegar en producción** (Render + Vercel)
4. **Probar en producción**
5. **Crear usuario admin**

