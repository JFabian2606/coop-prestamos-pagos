-- ============================================================
-- ESQUEMA SIMPLIFICADO: Usuario con rol directo
-- ============================================================
-- Este esquema usa rol_id directamente en la tabla usuario
-- en lugar de la tabla de relación usuario_rol
-- ============================================================

-- Tabla de roles
CREATE TABLE public.rol (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nombre character varying NOT NULL UNIQUE,
  CONSTRAINT rol_pkey PRIMARY KEY (id)
);

-- Tabla de permisos
CREATE TABLE public.permiso (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  codigo character varying NOT NULL UNIQUE,
  descripcion character varying,
  CONSTRAINT permiso_pkey PRIMARY KEY (id)
);

-- Tabla de relación rol-permiso (muchos a muchos)
CREATE TABLE public.rol_permiso (
  rol_id uuid NOT NULL,
  permiso_id uuid NOT NULL,
  CONSTRAINT rol_permiso_pkey PRIMARY KEY (rol_id, permiso_id),
  CONSTRAINT fk_rol_permiso__rol FOREIGN KEY (rol_id) REFERENCES public.rol(id),
  CONSTRAINT fk_rol_permiso__permiso FOREIGN KEY (permiso_id) REFERENCES public.permiso(id)
);

-- Tabla de usuarios CON rol_id directo
CREATE TABLE public.usuario (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email character varying NOT NULL UNIQUE,
  password_hash character varying NOT NULL,
  nombres character varying NOT NULL,
  activo boolean NOT NULL DEFAULT true,
  rol_id uuid, -- Rol directo (puede ser NULL si no está asignado)
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT usuario_pkey PRIMARY KEY (id),
  CONSTRAINT fk_usuario__rol FOREIGN KEY (rol_id) REFERENCES public.rol(id)
);

-- Índice para mejorar performance de consultas por rol
CREATE INDEX idx_usuario_rol_id ON public.usuario(rol_id);

-- Tabla de socios
-- Relación directa con usuario (elimina redundancia con auth_user)
CREATE TABLE public.socio (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  usuario_id uuid UNIQUE,  -- Relación directa con usuario (opcional, puede ser NULL si el socio no tiene cuenta)
  nombres character varying NOT NULL,
  documento character varying NOT NULL UNIQUE,
  email character varying UNIQUE,
  telefono character varying,
  empleador character varying,
  estado character varying NOT NULL DEFAULT 'ACTIVO',
  fecha_alta date NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT socio_pkey PRIMARY KEY (id),
  CONSTRAINT fk_socio__usuario FOREIGN KEY (usuario_id) REFERENCES public.usuario(id) ON DELETE SET NULL
);

-- Índice para mejorar consultas por usuario
CREATE INDEX idx_socio_usuario_id ON public.socio(usuario_id);

-- Tabla de productos de préstamo
CREATE TABLE public.producto_prestamo (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nombre character varying NOT NULL UNIQUE,
  tipo character varying NOT NULL,
  tasa_nominal_anual numeric NOT NULL,
  plazo_max_meses integer NOT NULL,
  requisitos_json jsonb,
  CONSTRAINT producto_prestamo_pkey PRIMARY KEY (id)
);

-- Tabla de solicitudes
CREATE TABLE public.solicitud (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  socio_id uuid NOT NULL,
  producto_id uuid NOT NULL,
  monto numeric NOT NULL,
  plazo_meses integer NOT NULL,
  ingresos numeric,
  egresos numeric,
  estado character varying NOT NULL DEFAULT 'BORRADOR',
  comentarios text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT solicitud_pkey PRIMARY KEY (id),
  CONSTRAINT fk_solicitud__socio FOREIGN KEY (socio_id) REFERENCES public.socio(id),
  CONSTRAINT fk_solicitud__producto FOREIGN KEY (producto_id) REFERENCES public.producto_prestamo(id)
);

-- Tabla de evaluaciones
CREATE TABLE public.evaluacion (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  solicitud_id uuid NOT NULL,
  analista_id uuid NOT NULL,
  recomendacion character varying NOT NULL,
  comentario text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT evaluacion_pkey PRIMARY KEY (id),
  CONSTRAINT fk_evaluacion__solicitud FOREIGN KEY (solicitud_id) REFERENCES public.solicitud(id),
  CONSTRAINT fk_evaluacion__analista FOREIGN KEY (analista_id) REFERENCES public.usuario(id)
);

-- Tabla de préstamos
CREATE TABLE public.prestamo (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  solicitud_id uuid NOT NULL UNIQUE,
  socio_id uuid NOT NULL,
  producto_id uuid NOT NULL,
  monto numeric NOT NULL,
  tasa_mensual numeric NOT NULL,
  plazo_meses integer NOT NULL,
  estado character varying NOT NULL DEFAULT 'VIGENTE',
  saldo_actual numeric NOT NULL,
  fecha_desembolso date,
  CONSTRAINT prestamo_pkey PRIMARY KEY (id),
  CONSTRAINT fk_prestamo__solicitud FOREIGN KEY (solicitud_id) REFERENCES public.solicitud(id),
  CONSTRAINT fk_prestamo__socio FOREIGN KEY (socio_id) REFERENCES public.socio(id),
  CONSTRAINT fk_prestamo__producto FOREIGN KEY (producto_id) REFERENCES public.producto_prestamo(id)
);

-- Tabla de cuotas
CREATE TABLE public.cuota (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  prestamo_id uuid NOT NULL,
  nro integer NOT NULL,
  fecha_venc date NOT NULL,
  capital numeric NOT NULL,
  interes numeric NOT NULL,
  total numeric NOT NULL,
  saldo_restante numeric NOT NULL,
  pagada boolean NOT NULL DEFAULT false,
  CONSTRAINT cuota_pkey PRIMARY KEY (id),
  CONSTRAINT fk_cuota__prestamo FOREIGN KEY (prestamo_id) REFERENCES public.prestamo(id)
);

-- Tabla de medios de pago
CREATE TABLE public.medio_pago (
  codigo character varying NOT NULL,
  nombre character varying NOT NULL,
  CONSTRAINT medio_pago_pkey PRIMARY KEY (codigo)
);

-- Tabla de pagos
CREATE TABLE public.pago (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  prestamo_id uuid NOT NULL,
  cuota_id uuid,
  fecha timestamp with time zone NOT NULL DEFAULT now(),
  monto numeric NOT NULL,
  medio character varying NOT NULL,
  referencia character varying,
  cajero_id uuid NOT NULL,
  CONSTRAINT pago_pkey PRIMARY KEY (id),
  CONSTRAINT fk_pago__prestamo FOREIGN KEY (prestamo_id) REFERENCES public.prestamo(id),
  CONSTRAINT fk_pago__cuota FOREIGN KEY (cuota_id) REFERENCES public.cuota(id),
  CONSTRAINT fk_pago__medio FOREIGN KEY (medio) REFERENCES public.medio_pago(codigo),
  CONSTRAINT fk_pago__usuario FOREIGN KEY (cajero_id) REFERENCES public.usuario(id)
);

-- Tabla de desembolsos
CREATE TABLE public.desembolso (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  prestamo_id uuid NOT NULL,
  monto numeric NOT NULL,
  metodo character varying NOT NULL,
  referencia character varying,
  fecha timestamp with time zone NOT NULL DEFAULT now(),
  tesorero_id uuid NOT NULL,
  CONSTRAINT desembolso_pkey PRIMARY KEY (id),
  CONSTRAINT fk_desembolso__prestamo FOREIGN KEY (prestamo_id) REFERENCES public.prestamo(id),
  CONSTRAINT fk_desembolso__usuario FOREIGN KEY (tesorero_id) REFERENCES public.usuario(id)
);

-- Tabla de documentos
CREATE TABLE public.documento (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  socio_id uuid,
  solicitud_id uuid,
  tipo character varying NOT NULL,
  ruta text NOT NULL,
  subido_por uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT documento_pkey PRIMARY KEY (id),
  CONSTRAINT fk_documento__socio FOREIGN KEY (socio_id) REFERENCES public.socio(id),
  CONSTRAINT fk_documento__solicitud FOREIGN KEY (solicitud_id) REFERENCES public.solicitud(id),
  CONSTRAINT fk_documento__usuario FOREIGN KEY (subido_por) REFERENCES public.usuario(id)
);

-- Tabla de auditoría genérica
-- Registra eventos importantes de todas las entidades del sistema
-- para cumplimiento regulatorio, auditorías y seguridad
CREATE TABLE public.auditoria (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  entidad character varying NOT NULL,        -- 'prestamo', 'pago', 'solicitud', etc.
  entidad_id uuid NOT NULL,                  -- ID de la entidad afectada
  accion character varying NOT NULL,          -- 'CREADO', 'MODIFICADO', 'APROBADO', etc.
  usuario_id uuid NOT NULL,                  -- Usuario que realizó la acción
  timestamp timestamp with time zone NOT NULL DEFAULT now(),
  payload jsonb,                             -- Datos adicionales relevantes
  CONSTRAINT auditoria_pkey PRIMARY KEY (id),
  CONSTRAINT fk_auditoria__usuario FOREIGN KEY (usuario_id) REFERENCES public.usuario(id)
);

-- Índices para mejorar performance de consultas comunes
CREATE INDEX idx_auditoria_entidad ON public.auditoria(entidad, entidad_id);
CREATE INDEX idx_auditoria_usuario ON public.auditoria(usuario_id);
CREATE INDEX idx_auditoria_timestamp ON public.auditoria(timestamp DESC);
CREATE INDEX idx_auditoria_accion ON public.auditoria(accion) WHERE accion IN ('CREADO', 'MODIFICADO', 'ELIMINADO');

-- Tabla de parámetros del sistema
CREATE TABLE public.parametro_sistema (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  clave character varying NOT NULL UNIQUE,
  valor text NOT NULL,
  CONSTRAINT parametro_sistema_pkey PRIMARY KEY (id)
);

-- ============================================================
-- DATOS INICIALES
-- ============================================================

-- Insertar roles comunes
INSERT INTO public.rol (nombre) VALUES 
  ('SOCIO'),
  ('ADMIN'),
  ('ANALISTA'),
  ('TESORERO'),
  ('CAJERO');

-- Insertar medios de pago
INSERT INTO public.medio_pago (codigo, nombre) VALUES
  ('EFECTIVO', 'Efectivo'),
  ('TRANSFERENCIA', 'Transferencia'),
  ('TARJETA', 'Tarjeta'),
  ('DEBITO_AUTOMATICO', 'Débito Automático');

-- ============================================================
-- VISTAS ÚTILES (OPCIONAL)
-- ============================================================

-- Vista para ver usuarios con su rol
CREATE OR REPLACE VIEW public.v_usuarios_con_rol AS
SELECT 
  u.id,
  u.email,
  u.nombres,
  u.activo,
  r.nombre as rol,
  u.created_at
FROM public.usuario u
LEFT JOIN public.rol r ON u.rol_id = r.id;

-- ============================================================
-- FUNCIONES ÚTILES (OPCIONAL)
-- ============================================================

-- Función para verificar si un usuario tiene un rol específico
CREATE OR REPLACE FUNCTION public.usuario_tiene_rol(
  p_usuario_id uuid,
  p_rol_nombre character varying
) RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.usuario u
    JOIN public.rol r ON u.rol_id = r.id
    WHERE u.id = p_usuario_id 
      AND r.nombre = p_rol_nombre
      AND u.activo = true
  );
END;
$$ LANGUAGE plpgsql;



