-- ====================================================================
-- Tablas maestras y de seguridad
-- ====================================================================

CREATE TABLE usuario (
  id            CHAR(36)     NOT NULL,
  email         VARCHAR(191) NOT NULL,
  password_hash VARCHAR(191) NOT NULL,
  nombres       VARCHAR(191) NOT NULL,
  activo        TINYINT(1)   NOT NULL DEFAULT 1,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_usuario_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE rol (
  id      CHAR(36)     NOT NULL,
  nombre  VARCHAR(100) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_rol_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE permiso (
  id          CHAR(36)      NOT NULL,
  codigo      VARCHAR(120)  NOT NULL,
  descripcion VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_permiso_codigo (codigo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE rol_permiso (
  rol_id     CHAR(36) NOT NULL,
  permiso_id CHAR(36) NOT NULL,
  PRIMARY KEY (rol_id, permiso_id),
  KEY fk_rol_permiso__permiso (permiso_id),
  CONSTRAINT fk_rol_permiso__rol
    FOREIGN KEY (rol_id) REFERENCES rol(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_rol_permiso__permiso
    FOREIGN KEY (permiso_id) REFERENCES permiso(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE usuario_rol (
  usuario_id CHAR(36) NOT NULL,
  rol_id     CHAR(36) NOT NULL,
  PRIMARY KEY (usuario_id, rol_id),
  KEY fk_usuario_rol__rol (rol_id),
  CONSTRAINT fk_usuario_rol__usuario
    FOREIGN KEY (usuario_id) REFERENCES usuario(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_usuario_rol__rol
    FOREIGN KEY (rol_id) REFERENCES rol(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE parametro_sistema (
  id    CHAR(36)      NOT NULL,
  clave VARCHAR(120)  NOT NULL,
  valor TEXT          NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_parametro_clave (clave)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ====================================================================
-- Catálogos y entidades principales
-- ====================================================================

CREATE TABLE medio_pago (
  codigo VARCHAR(40)  NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  PRIMARY KEY (codigo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO medio_pago (codigo, nombre) VALUES
 ('DEBITO_AUTOMATICO','Débito Automático'),
 ('EFECTIVO','Efectivo'),
 ('TARJETA','Tarjeta'),
 ('TRANSFERENCIA','Transferencia')
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre);

CREATE TABLE socio (
  id          CHAR(36)     NOT NULL,
  nombres     VARCHAR(191) NOT NULL,
  documento   VARCHAR(50)  NOT NULL,
  email       VARCHAR(191) DEFAULT NULL,
  telefono    VARCHAR(50)  DEFAULT NULL,
  empleador   VARCHAR(191) DEFAULT NULL,
  estado      ENUM('ACTIVO','INACTIVO','SUSPENDIDO') NOT NULL DEFAULT 'ACTIVO',
  fecha_alta  DATE         NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_socio_documento (documento),
  UNIQUE KEY uq_socio_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE producto_prestamo (
  id                 CHAR(36)     NOT NULL,
  nombre             VARCHAR(120) NOT NULL,
  tipo               VARCHAR(80)  NOT NULL,
  tasa_nominal_anual DECIMAL(7,4) NOT NULL,
  plazo_max_meses    INT          NOT NULL,
  requisitos_json    LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL
                     CHECK (JSON_VALID(requisitos_json)),
  PRIMARY KEY (id),
  UNIQUE KEY uq_producto_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE solicitud (
  id           CHAR(36)    NOT NULL,
  socio_id     CHAR(36)    NOT NULL,
  producto_id  CHAR(36)    NOT NULL,
  monto        DECIMAL(14,2) NOT NULL,
  plazo_meses  INT         NOT NULL,
  ingresos     DECIMAL(14,2) DEFAULT NULL,
  egresos      DECIMAL(14,2) DEFAULT NULL,
  estado       ENUM('BORRADOR','ENVIADA','EN_EVALUACION','APROBADA','RECHAZADA')
               NOT NULL DEFAULT 'BORRADOR',
  comentarios  TEXT DEFAULT NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_solicitud_socio (socio_id),
  KEY fk_solicitud__producto (producto_id),
  CONSTRAINT fk_solicitud__socio
    FOREIGN KEY (socio_id) REFERENCES socio(id)
    ON UPDATE CASCADE,
  CONSTRAINT fk_solicitud__producto
    FOREIGN KEY (producto_id) REFERENCES producto_prestamo(id)
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE evaluacion (
  id            CHAR(36)     NOT NULL,
  solicitud_id  CHAR(36)     NOT NULL,
  analista_id   CHAR(36)     NOT NULL,
  recomendacion VARCHAR(100) NOT NULL,
  comentario    TEXT DEFAULT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_evaluacion_por_solicitud (solicitud_id), -- 0..1 evaluación por solicitud (diagrama)
  KEY fk_evaluacion__analista (analista_id),
  CONSTRAINT fk_evaluacion__solicitud
    FOREIGN KEY (solicitud_id) REFERENCES solicitud(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_evaluacion__analista
    FOREIGN KEY (analista_id) REFERENCES usuario(id)
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE documento (
  id           CHAR(36)    NOT NULL,
  socio_id     CHAR(36)    DEFAULT NULL,
  solicitud_id CHAR(36)    DEFAULT NULL,
  tipo         VARCHAR(80) NOT NULL,
  ruta         VARCHAR(255) NOT NULL,
  subido_por   CHAR(36)    NOT NULL,
  created_at   DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_doc_socio (socio_id),
  KEY idx_doc_solicitud (solicitud_id),
  KEY fk_documento__usuario (subido_por),
  CONSTRAINT fk_documento__socio
    FOREIGN KEY (socio_id) REFERENCES socio(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_documento__solicitud
    FOREIGN KEY (solicitud_id) REFERENCES solicitud(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_documento__usuario
    FOREIGN KEY (subido_por) REFERENCES usuario(id)
    ON UPDATE CASCADE,
  CONSTRAINT chk_documento_referencia
    CHECK (socio_id IS NOT NULL OR solicitud_id IS NOT NULL)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE prestamo (
  id              CHAR(36)    NOT NULL,
  solicitud_id    CHAR(36)    NOT NULL,
  socio_id        CHAR(36)    NOT NULL,
  producto_id     CHAR(36)    NOT NULL,
  monto           DECIMAL(14,2) NOT NULL,
  tasa_mensual    DECIMAL(7,4)  NOT NULL,
  plazo_meses     INT           NOT NULL,
  estado          ENUM('VIGENTE','CANCELADO','CASTIGADO') NOT NULL DEFAULT 'VIGENTE',
  saldo_actual    DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  fecha_desembolso DATE DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_prestamo_solicitud (solicitud_id),
  KEY idx_prestamo_socio (socio_id),
  KEY fk_prestamo__producto (producto_id),
  CONSTRAINT fk_prestamo__solicitud
    FOREIGN KEY (solicitud_id) REFERENCES solicitud(id)
    ON UPDATE CASCADE,
  CONSTRAINT fk_prestamo__socio
    FOREIGN KEY (socio_id) REFERENCES socio(id)
    ON UPDATE CASCADE,
  CONSTRAINT fk_prestamo__producto
    FOREIGN KEY (producto_id) REFERENCES producto_prestamo(id)
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE desembolso (
  id           CHAR(36)     NOT NULL,
  prestamo_id  CHAR(36)     NOT NULL,
  monto        DECIMAL(14,2) NOT NULL,
  metodo       VARCHAR(60)  NOT NULL,
  referencia   VARCHAR(120) DEFAULT NULL,
  fecha        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  tesorero_id  CHAR(36)     NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_desembolso_por_prestamo (prestamo_id), -- 1 desembolso por préstamo (diagrama)
  KEY idx_desembolso_prestamo (prestamo_id),
  KEY fk_desembolso__usuario (tesorero_id),
  CONSTRAINT fk_desembolso__prestamo
    FOREIGN KEY (prestamo_id) REFERENCES prestamo(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_desembolso__usuario
    FOREIGN KEY (tesorero_id) REFERENCES usuario(id)
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE cuota (
  id              CHAR(36)     NOT NULL,
  prestamo_id     CHAR(36)     NOT NULL,
  nro             INT          NOT NULL,
  fecha_venc      DATE         NOT NULL,
  capital         DECIMAL(14,2) NOT NULL,
  interes         DECIMAL(14,2) NOT NULL,
  total           DECIMAL(14,2) NOT NULL,
  saldo_restante  DECIMAL(14,2) NOT NULL,
  pagada          TINYINT(1)   NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_cuota_prestamo_nro (prestamo_id, nro),
  KEY idx_cuota_venc (fecha_venc),
  CONSTRAINT fk_cuota__prestamo
    FOREIGN KEY (prestamo_id) REFERENCES prestamo(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE pago (
  id          CHAR(36)     NOT NULL,
  prestamo_id CHAR(36)     NOT NULL,
  cuota_id    CHAR(36)     DEFAULT NULL,
  fecha       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  monto       DECIMAL(14,2) NOT NULL,
  medio       VARCHAR(40)  NOT NULL,
  referencia  VARCHAR(120) DEFAULT NULL,
  cajero_id   CHAR(36)     NOT NULL,
  PRIMARY KEY (id),
  KEY idx_pago_prestamo (prestamo_id),
  KEY idx_pago_cuota (cuota_id),
  KEY fk_pago__medio (medio),
  KEY fk_pago__usuario (cajero_id),
  CONSTRAINT fk_pago__prestamo
    FOREIGN KEY (prestamo_id) REFERENCES prestamo(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_pago__cuota
    FOREIGN KEY (cuota_id) REFERENCES cuota(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_pago__medio
    FOREIGN KEY (medio) REFERENCES medio_pago(codigo)
    ON UPDATE CASCADE,
  CONSTRAINT fk_pago__usuario
    FOREIGN KEY (cajero_id) REFERENCES usuario(id)
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE auditoria (
  id          CHAR(36)     NOT NULL,
  entidad     VARCHAR(120) NOT NULL,
  entidad_id  CHAR(36)     NOT NULL,
  accion      VARCHAR(50)  NOT NULL,
  usuario_id  CHAR(36)     NOT NULL,
  timestamp   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  payload     LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL
              CHECK (JSON_VALID(payload)),
  PRIMARY KEY (id),
  KEY idx_auditoria_entidad (entidad, entidad_id),
  KEY fk_auditoria__usuario (usuario_id),
  CONSTRAINT fk_auditoria__usuario
    FOREIGN KEY (usuario_id) REFERENCES usuario(id)
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Índices adicionales sugeridos para consultas comunes
-- CREATE INDEX idx_prestamo_estado ON prestamo(estado);
-- CREATE INDEX idx_pago_fecha ON pago(fecha);
-- CREATE INDEX idx_desembolso_fecha ON desembolso(fecha);

