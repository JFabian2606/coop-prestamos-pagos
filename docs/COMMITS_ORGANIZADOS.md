# 📝 Commits Organizados para Git

## 🎯 Estructura de Commits Sugerida

### Commit 1: Unificación de usuarios y roles
```bash
git add backend/apps/usuarios/
git add backend/core/settings.py
git add backend/apps/socios/models.py
git commit -m "feat: Unificar sistema de usuarios - Eliminar redundancia auth_user/usuario

- Crear app usuarios con modelo Usuario personalizado
- Usar tabla 'usuario' de Supabase directamente
- Implementar rol_id directo en usuario (simplificado)
- Actualizar modelo Socio para usar usuario_id
- Configurar AUTH_USER_MODEL = 'usuarios.Usuario'"
```

### Commit 2: Autenticación propia
```bash
git add backend/apps/usuarios/views.py
git add backend/apps/usuarios/urls.py
git add backend/core/urls.py
git add backend/core/settings.py
git add frontend/src/api.ts
git add frontend/src/components/LoginRegistro.tsx
git add frontend/src/App.tsx
git commit -m "feat: Implementar autenticación propia - Reemplazar Supabase Auth

- Crear endpoints de registro/login/logout propios
- Usar SessionAuthentication de Django
- Actualizar frontend para usar endpoints propios
- Configurar CORS para cookies
- Eliminar dependencia de Supabase Auth"
```

### Commit 3: Registro automático de socios
```bash
git add backend/apps/usuarios/signals.py
git add backend/apps/usuarios/apps.py
git add backend/apps/socios/auth.py
git commit -m "feat: Registro automático de socios

- Signal que crea Socio automáticamente al registrar usuario
- Asignación automática de rol SOCIO a nuevos usuarios
- Creación automática de socio con estado ACTIVO"
```

### Commit 4: Comandos y utilidades
```bash
git add backend/apps/usuarios/management/
git commit -m "feat: Comando para crear usuarios desde CLI

- Agregar comando 'crear_usuario' para gestión de usuarios
- Soporte para diferentes roles y flags"
```

### Commit 5: Esquema de base de datos
```bash
git add docs/base-de-datos/schema_postgresql_simplificado.sql
git add docs/base-de-datos/scripts_insertar_usuario.sql
git commit -m "docs: Actualizar esquema de base de datos

- Esquema PostgreSQL simplificado con rol_id directo
- Scripts para insertar usuarios
- Tabla auditoria genérica con índices optimizados"
```

### Commit 6: Configuración de despliegue
```bash
git add render.yaml
git add Procfile
git add docs/DESPLIEGUE_PRODUCCION.md
git add docs/CHECKLIST_DESPLIEGUE.md
git commit -m "feat: Configurar despliegue en Render y Vercel

- Actualizar render.yaml con comandos correctos
- Configurar Procfile para producción
- Documentar proceso de despliegue
- Configurar CORS y seguridad para producción"
```

### Commit 7: Documentación
```bash
git add docs/
git commit -m "docs: Agregar documentación completa

- Guías de despliegue
- Comandos de shell
- Resumen de cambios para Kanban"
```

## 🚀 Comando Rápido (Todo en uno)

Si prefieres hacer commits más pequeños, puedes hacerlo manualmente o usar este script:

```bash
# Ver cambios
git status

# Agregar todo
git add .

# Commit único (si prefieres)
git commit -m "feat: Unificar usuarios, autenticación propia y despliegue

- Unificar sistema de usuarios (eliminar redundancia)
- Implementar autenticación propia sin Supabase Auth
- Registro automático de socios
- Configurar despliegue en Render y Vercel
- Actualizar esquema de base de datos
- Agregar comandos de gestión y documentación"

# Push
git push origin main
# o
git push origin master
```

## 📋 Resumen para Kanban

### Tareas Completadas ✅

1. **Unificar sistema de usuarios**
   - Eliminada redundancia entre auth_user y usuario
   - Modelo Usuario personalizado
   - Relación directa socio.usuario_id

2. **Implementar autenticación propia**
   - Endpoints de registro/login/logout
   - SessionAuthentication
   - Frontend actualizado

3. **Registro automático de socios**
   - Signal automático
   - Asignación de rol SOCIO por defecto

4. **Configurar despliegue**
   - Render.yaml actualizado
   - Variables de entorno documentadas
   - CORS configurado

### Estado: ✅ Listo para Despliegue

