-- ============================================================
-- SCRIPTS PARA INSERTAR USUARIOS EN LA BD
-- ============================================================

-- ============================================================
-- 1. INSERTAR ROLES PRIMERO (si no existen)
-- ============================================================

INSERT INTO public.rol (id, nombre) VALUES
  (gen_random_uuid(), 'SOCIO')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO public.rol (id, nombre) VALUES
  (gen_random_uuid(), 'ADMIN')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO public.rol (id, nombre) VALUES
  (gen_random_uuid(), 'ANALISTA')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO public.rol (id, nombre) VALUES
  (gen_random_uuid(), 'TESORERO')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO public.rol (id, nombre) VALUES
  (gen_random_uuid(), 'CAJERO')
ON CONFLICT (nombre) DO NOTHING;

-- ============================================================
-- 2. INSERTAR USUARIO ADMINISTRADOR
-- ============================================================

-- Obtener el ID del rol ADMIN
WITH admin_rol AS (
  SELECT id FROM public.rol WHERE nombre = 'ADMIN' LIMIT 1
)
INSERT INTO public.usuario (
  id,
  email,
  password_hash,
  nombres,
  activo,
  rol_id,
  created_at
)
SELECT
  gen_random_uuid(),
  'admin@cooperativa.com',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYqJ5q5q5q5', -- Cambiar por hash real
  'Administrador del Sistema',
  true,
  admin_rol.id,
  NOW()
FROM admin_rol
ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- 3. INSERTAR USUARIO SOCIO
-- ============================================================

WITH socio_rol AS (
  SELECT id FROM public.rol WHERE nombre = 'SOCIO' LIMIT 1
)
INSERT INTO public.usuario (
  id,
  email,
  password_hash,
  nombres,
  activo,
  rol_id,
  created_at
)
SELECT
  gen_random_uuid(),
  'socio@example.com',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYqJ5q5q5q5', -- Cambiar por hash real
  'Juan Pérez',
  true,
  socio_rol.id,
  NOW()
FROM socio_rol
ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- 4. INSERTAR USUARIO ANALISTA
-- ============================================================

WITH analista_rol AS (
  SELECT id FROM public.rol WHERE nombre = 'ANALISTA' LIMIT 1
)
INSERT INTO public.usuario (
  id,
  email,
  password_hash,
  nombres,
  activo,
  rol_id,
  created_at
)
SELECT
  gen_random_uuid(),
  'analista@cooperativa.com',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYqJ5q5q5q5', -- Cambiar por hash real
  'María González',
  true,
  analista_rol.id,
  NOW()
FROM analista_rol
ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- 5. INSERTAR USUARIO CON SOCIO ASOCIADO
-- ============================================================

-- Primero crear el usuario
WITH socio_rol AS (
  SELECT id FROM public.rol WHERE nombre = 'SOCIO' LIMIT 1
),
nuevo_usuario AS (
  INSERT INTO public.usuario (
    id,
    email,
    password_hash,
    nombres,
    activo,
    rol_id,
    created_at
  )
  SELECT
    gen_random_uuid(),
    'juan.perez@example.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYqJ5q5q5q5',
    'Juan Pérez',
    true,
    socio_rol.id,
    NOW()
  FROM socio_rol
  ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
  RETURNING id, email
)
-- Luego crear el socio asociado
INSERT INTO public.socio (
  id,
  usuario_id,
  nombres,
  documento,
  telefono,
  direccion,
  estado,
  fecha_alta,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  nuevo_usuario.id,
  'Juan Pérez',
  '12345678-9',
  '0981-123456',
  'Av. Principal 123',
  'ACTIVO',
  CURRENT_DATE,
  NOW(),
  NOW()
FROM nuevo_usuario
ON CONFLICT (documento) DO NOTHING;

-- ============================================================
-- 6. FUNCIÓN HELPER PARA CREAR USUARIO (OPCIONAL)
-- ============================================================

CREATE OR REPLACE FUNCTION crear_usuario(
  p_email VARCHAR,
  p_password_hash VARCHAR,
  p_nombres VARCHAR,
  p_rol_nombre VARCHAR DEFAULT 'SOCIO',
  p_activo BOOLEAN DEFAULT true
) RETURNS UUID AS $$
DECLARE
  v_rol_id UUID;
  v_usuario_id UUID;
BEGIN
  -- Obtener o crear rol
  SELECT id INTO v_rol_id FROM public.rol WHERE nombre = p_rol_nombre;
  
  IF v_rol_id IS NULL THEN
    RAISE EXCEPTION 'Rol % no existe', p_rol_nombre;
  END IF;
  
  -- Crear usuario
  INSERT INTO public.usuario (
    id,
    email,
    password_hash,
    nombres,
    activo,
    rol_id,
    created_at
  )
  VALUES (
    gen_random_uuid(),
    p_email,
    p_password_hash,
    p_nombres,
    p_activo,
    v_rol_id,
    NOW()
  )
  ON CONFLICT (email) DO UPDATE SET
    nombres = EXCLUDED.nombres,
    activo = EXCLUDED.activo,
    rol_id = EXCLUDED.rol_id
  RETURNING id INTO v_usuario_id;
  
  RETURN v_usuario_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 7. USO DE LA FUNCIÓN HELPER
-- ============================================================

-- Ejemplo: Crear usuario ADMIN
SELECT crear_usuario(
  'admin2@cooperativa.com',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYqJ5q5q5q5',
  'Admin 2',
  'ADMIN',
  true
);

-- Ejemplo: Crear usuario SOCIO
SELECT crear_usuario(
  'socio2@example.com',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYqJ5q5q5q5',
  'Pedro Martínez',
  'SOCIO',
  true
);

-- ============================================================
-- 8. VERIFICAR USUARIOS CREADOS
-- ============================================================

-- Ver todos los usuarios con sus roles
SELECT 
  u.id,
  u.email,
  u.nombres,
  u.activo,
  r.nombre as rol,
  u.created_at
FROM public.usuario u
LEFT JOIN public.rol r ON u.rol_id = r.id
ORDER BY u.created_at DESC;

-- Ver usuarios y sus socios asociados
SELECT 
  u.id as usuario_id,
  u.email,
  u.nombres as usuario_nombre,
  r.nombre as rol,
  s.id as socio_id,
  s.nombre_completo as socio_nombre,
  s.documento,
  s.estado as socio_estado
FROM public.usuario u
LEFT JOIN public.rol r ON u.rol_id = r.id
LEFT JOIN public.socio s ON s.usuario_id = u.id
ORDER BY u.created_at DESC;

