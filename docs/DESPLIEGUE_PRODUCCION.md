# 🚀 Guía de Despliegue en Vercel y Render

## 📋 Resumen

- **Frontend**: Vercel (React/Vite)
- **Backend**: Render (Django)
- **Base de Datos**: Supabase PostgreSQL

## 🔧 Paso 1: Configurar Backend en Render

### 1.1. Crear Servicio en Render

1. Ve a [Render Dashboard](https://dashboard.render.com)
2. Click en "New" → "Web Service"
3. Conecta tu repositorio de GitHub
4. Configura:

**Build Command:**
```bash
cd backend && pip install -r requirements.txt && python manage.py collectstatic --noinput
```

**Start Command:**
```bash
cd backend && python manage.py migrate && gunicorn core.wsgi:application --bind 0.0.0.0:$PORT
```

### 1.2. Variables de Entorno en Render

Configura estas variables en Render Dashboard:

```bash
# Django
SECRET_KEY=tu-secret-key-super-seguro-generar-con-django
DEBUG=False
ALLOWED_HOSTS=tu-app.onrender.com,cooprestamos.onrender.com
DJANGO_SETTINGS_MODULE=core.settings
PYTHON_VERSION=3.12.7

# Base de Datos (Supabase)
SUPABASE_HOST=tu-proyecto.supabase.co
SUPABASE_DB_NAME=postgres
SUPABASE_USER=postgres
SUPABASE_PASSWORD=tu-password-supabase
SUPABASE_PORT=6543
SUPABASE_POOL_MODE=session

# CORS (URLs del frontend)
CORS_ALLOWED_ORIGINS=https://tu-app.vercel.app,https://coop-prestamos-pagos.vercel.app

# Opcional (si usas Supabase Auth)
SUPABASE_JWT_SECRET=tu-jwt-secret
SUPABASE_JWT_AUDIENCE=authenticated
SUPABASE_ADMIN_EMAILS=admin@coop.com
```

### 1.3. Generar SECRET_KEY

```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

## 🔧 Paso 2: Configurar Frontend en Vercel

### 2.1. Crear Proyecto en Vercel

1. Ve a [Vercel Dashboard](https://vercel.com)
2. Click en "Add New" → "Project"
3. Conecta tu repositorio
4. Configura:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### 2.2. Variables de Entorno en Vercel

Configura estas variables:

```bash
# URL del backend en Render
VITE_API_URL=https://tu-app.onrender.com/api/
VITE_API_TIMEOUT=30000
```

### 2.3. Actualizar vercel.json

El archivo `vercel.json` ya está configurado para hacer proxy de `/api/*` al backend de Render.

## 🔧 Paso 3: Configurar Base de Datos (Supabase)

### 3.1. Ejecutar Migraciones

En Supabase SQL Editor, ejecuta:

```sql
-- Ejecutar el esquema completo
-- Archivo: docs/base-de-datos/schema_postgresql_simplificado.sql
```

### 3.2. Crear Roles Iniciales

```sql
INSERT INTO public.rol (nombre) VALUES 
  ('SOCIO'),
  ('ADMIN'),
  ('ANALISTA'),
  ('TESORERO'),
  ('CAJERO')
ON CONFLICT (nombre) DO NOTHING;
```

### 3.3. Crear Usuario Admin

```sql
-- O usar el comando Django después del despliegue
-- python manage.py crear_usuario --email admin@coop.com --nombres "Admin" --rol ADMIN --staff --superuser --password admin123
```

## ✅ Paso 4: Verificar Despliegue

### Backend (Render)

1. Verifica que el servicio esté "Live"
2. Prueba: `https://tu-app.onrender.com/api/ping/`
3. Debería responder: `{"status": "ok"}`

### Frontend (Vercel)

1. Verifica que el build sea exitoso
2. Prueba: `https://tu-app.vercel.app`
3. Debería mostrar la pantalla de login

### Probar Endpoints

```bash
# Health check
curl https://tu-app.onrender.com/healthz

# API ping
curl https://tu-app.onrender.com/api/ping/

# Registrar usuario (desde frontend)
# POST https://tu-app.onrender.com/api/auth/registro/
```

## 🔒 Paso 5: Seguridad en Producción

### Backend (settings.py)

Asegúrate de que en producción:

```python
DEBUG = False
SESSION_COOKIE_SECURE = True  # Solo HTTPS
CSRF_COOKIE_SECURE = True
```

### Variables Sensibles

- ✅ **NUNCA** commits `SECRET_KEY` en el código
- ✅ Usa variables de entorno en Render/Vercel
- ✅ Rota `SECRET_KEY` periódicamente

## 🐛 Solución de Problemas

### Error: "DisallowedHost"

Agrega tu dominio a `ALLOWED_HOSTS` en Render:
```
ALLOWED_HOSTS=tu-app.onrender.com,cooprestamos.onrender.com
```

### Error: CORS

Verifica que `CORS_ALLOWED_ORIGINS` incluya tu dominio de Vercel:
```
CORS_ALLOWED_ORIGINS=https://tu-app.vercel.app
```

### Error: "No module named X"

Verifica que `requirements.txt` incluya todas las dependencias.

### Error: Base de datos

Verifica:
- Variables de conexión a Supabase
- Que las tablas existan (ejecutar migraciones)
- Que el usuario de BD tenga permisos

## 📊 Checklist Pre-Despliegue

- [ ] `SECRET_KEY` generado y configurado
- [ ] `DEBUG=False` en producción
- [ ] `ALLOWED_HOSTS` configurado
- [ ] Variables de entorno configuradas en Render
- [ ] Variables de entorno configuradas en Vercel
- [ ] Base de datos migrada en Supabase
- [ ] Roles creados en BD
- [ ] CORS configurado correctamente
- [ ] `VITE_API_URL` apunta al backend de Render
- [ ] Probar registro/login localmente

## 🎯 URLs de Ejemplo

Después del despliegue:

- **Frontend**: `https://coop-prestamos-pagos.vercel.app`
- **Backend**: `https://cooprestamos.onrender.com`
- **API Docs**: `https://cooprestamos.onrender.com/api/docs/`
- **Admin**: `https://cooprestamos.onrender.com/admin/`

## 📝 Notas Importantes

1. **Primera vez**: Ejecuta migraciones manualmente o en el startCommand
2. **Static files**: Render puede servir static files, o usa un CDN
3. **Logs**: Revisa logs en Render Dashboard si hay errores
4. **Database**: Asegúrate de que Supabase permita conexiones desde Render

