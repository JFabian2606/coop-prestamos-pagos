# ✅ Checklist de Despliegue

## 🔧 Backend (Render)

### Configuración Inicial
- [ ] Repositorio conectado a Render
- [ ] Servicio Web creado
- [ ] Build Command configurado
- [ ] Start Command configurado

### Variables de Entorno
- [ ] `SECRET_KEY` generado y configurado
- [ ] `DEBUG=False`
- [ ] `ALLOWED_HOSTS` con dominio de Render
- [ ] `SUPABASE_HOST` configurado
- [ ] `SUPABASE_USER` configurado
- [ ] `SUPABASE_PASSWORD` configurado
- [ ] `SUPABASE_DB_NAME=postgres`
- [ ] `SUPABASE_PORT=6543`
- [ ] `CORS_ALLOWED_ORIGINS` con URL de Vercel

### Base de Datos
- [ ] Esquema ejecutado en Supabase
- [ ] Roles creados (SOCIO, ADMIN, etc.)
- [ ] Migraciones aplicadas (o en startCommand)

### Verificación
- [ ] Servicio está "Live" en Render
- [ ] Health check funciona: `/healthz`
- [ ] API ping funciona: `/api/ping/`
- [ ] Admin accesible: `/admin/`

## 🎨 Frontend (Vercel)

### Configuración Inicial
- [ ] Repositorio conectado a Vercel
- [ ] Proyecto creado
- [ ] Root Directory: `frontend`
- [ ] Build Command: `npm run build`
- [ ] Output Directory: `dist`

### Variables de Entorno
- [ ] `VITE_API_URL` apunta al backend de Render
- [ ] `VITE_API_TIMEOUT` configurado (opcional)

### Verificación
- [ ] Build exitoso
- [ ] Deploy completado
- [ ] Frontend accesible
- [ ] Login/Registro funciona
- [ ] Requests al backend funcionan

## 🔐 Seguridad

- [ ] `SECRET_KEY` no está en el código
- [ ] `DEBUG=False` en producción
- [ ] `SESSION_COOKIE_SECURE=True` (HTTPS)
- [ ] `CSRF_COOKIE_SECURE=True` (HTTPS)
- [ ] CORS configurado correctamente
- [ ] Variables sensibles en variables de entorno

## 📊 Pruebas Post-Despliegue

- [ ] Registrar nuevo usuario desde frontend
- [ ] Login funciona correctamente
- [ ] Usuario se crea en tabla `usuario`
- [ ] Socio se crea automáticamente
- [ ] Endpoints protegidos requieren autenticación
- [ ] Admin accesible con credenciales

## 🎯 URLs Finales

Anota tus URLs aquí:

- **Frontend Vercel**: `https://________________.vercel.app`
- **Backend Render**: `https://________________.onrender.com`
- **Supabase**: `https://________________.supabase.co`

