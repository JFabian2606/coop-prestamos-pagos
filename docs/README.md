
# 📘 README – BASE DE DATOS COOPRESTAMOS

## 1. 🏦 Introducción

COOPRESTAMOS es un sistema financiero enfocado en la gestión de:
- Solicitudes de préstamos
- Evaluaciones crediticias
- Decisiones (aprobación/rechazo)
- Desembolsos de préstamos
- Pagos realizados por los socios

Este archivo documenta:
- Estructura y relaciones
- Tipos de datos y restricciones
- Roles, permisos y seguridad (RLS)
- Cifrado de datos sensibles
- Optimización e índices
- Monitoreo de rendimiento
- Respaldos y recuperación

---

# 2. 🗂️ Modelo Entidad–Relación (ER)

### 👤 Tabla: `usuario`
Representa a los actores del sistema.
- PRIMARY KEY: `idUsuario`
- Campos clave:
  - `auth_id` (UUID Supabase)
  - `rol` (SOCIO, ANALISTA, TESORERO, CAJERO, ADMIN)
  - `NIdentificacion` (cifrado en bytea)
  - `contrasenia` (hash bcrypt)

---

### 📄 Tabla: `solicitudPrestamo`
Solicitudes realizadas por socios.
- PRIMARY KEY: `idSolicitudPrestamo`
- FOREIGN KEY: `idUsuario → usuario.idUsuario`
- Campos:
  - `montoSolicitado`
  - `plazo`
  - `fechaSolicitud`
  - `estadoSolicitud`

---

### 📝 Tabla: `evaluacion`
Evaluación hecha por un analista.
- PRIMARY KEY: `idEvaluacion`
- FOREIGN KEY: `idSolicitudPrestamo`
- Campos:
  - `riesgo`
  - `capacidadPago`
  - `comentariosAnalista`

---

### ⚖️ Tabla: `decision`
Define si se aprueba o no un préstamo.
- PRIMARY KEY: `idDecision`
- FOREIGN KEY: `idEvaluacion`
- Campos:
  - `estadoDecision` (APROBADO / RECHAZADO)
  - `motivoDecision`

---

### 💰 Tabla: `prestamo`
Préstamo creado tras aprobación.
- PRIMARY KEY: `idPrestamo`
- FOREIGN KEY: `idDecision`
- Campos:
  - `referenciaContrato` (cifrada)
  - `montoAprobado`
  - `tasaInteres`
  - `fechaCredito`

---

### 🧾 Tabla: `pago`
Pagos realizados por socios.
- PRIMARY KEY: `idPago`
- FOREIGN KEY: `idPrestamo`
- Campos:
  - `montoPagado`
  - `fechaPago`

---

# 3. 🔗 Relaciones principales del sistema


| Entidad Origen       | Relación | Entidad Destino     | Descripción |
|----------------------|----------|----------------------|-------------|
| usuario              | 1 → N    | solicitudPrestamo    | Un socio genera múltiples solicitudes |
| solicitudPrestamo    | 1 → 1    | evaluacion           | Una sol. tiene una evaluación |
| evaluacion           | 1 → 1    | decision             | Una evaluación genera una decisión |
| decision             | 1 → 1    | prestamo             | Decisión aprobada → préstamo |
| prestamo             | 1 → N    | pago                 | Un préstamo tiene varios pagos |

---


# 4. 🧱 Tipos de datos y restricciones


### ✔ Tipos usados:
- Enteros (`integer`)
- UUID (`uuid`)
- Fechas (`date`, `timestamp`)
- Cifrado (`bytea`)
- Hash (`text`)
- Texto con restricciones (`text CHECK`)

### ✔ Restricciones:
- `CHECK (rol IN (...))`
- `CHECK (estadoDecision IN ('APROBADO','RECHAZADO'))`
- Llaves foráneas con integridad asegurada
- `UNIQUE (auth_id)`
- Campos NOT NULL donde aplica

---


# 5. 🔐 Seguridad del sistema


## 5.1 Hash de contraseñas
Contraseñas almacenadas así:
```
crypt(password, gen_salt('bf'))
```
→ Utiliza **bcrypt**, no reversible.

---

## 5.2 Cifrado de datos sensibles
Campos cifrados:
- `NIdentificacion`
- `referenciaContrato`

Usando:
```
pgp_sym_encrypt(text, key)
pgp_sym_decrypt(bytea, key)
```

---

## 5.3 Row Level Security (RLS)
Habilitada en:
- usuario
- solicitudPrestamo
- evaluacion
- decision
- prestamo
- pago

Funciones auxiliares:
```
seguridad.current_id_usuario()
seguridad.current_rol()
```

Validaciones mediante:
```
auth.uid()
```

---


# 6. 🧩 Roles del sistema y permisos


| Rol | Permisos |
|-----|----------|
| SOCIO | Crea y ve sus solicitudes; ve sus préstamos y pagos |
| ANALISTA | Evalúa solicitudes; toma decisiones |
| TESORERO | Crea préstamos aprobados, ve pagos |
| CAJERO | Registra pagos y consulta información básica |
| ADMIN | Acceso total en todas las tablas |

Todo se implementa con **políticas RLS** sobre cada tabla.

---


# 7. 🚀 Optimización e índices


Para lograr tiempos de respuesta < 500 ms:

### Índices creados:
- `usuario(emailUsu)`
- `solicitudPrestamo(idUsuario, fechaSolicitud)`
- `evaluacion(idSolicitudPrestamo)`
- `decision(idEvaluacion)`
- `prestamo(idDecision, fechaCredito)`
- `pago(idPrestamo, fechaPago)`

### Beneficios:
- Mejoran reportes por fecha
- Aceleran búsquedas por usuario
- Reducen tiempos de carga en cascada (joins)

---


# 8. 📊 Monitoreo del rendimiento


Extensión habilitada:
```
pg_stat_statements
```

Vista creada:
```
top_queries_lentas
```

Esta vista muestra:
- Tiempo total
- Tiempo promedio
- Número de ejecuciones
- Consultas más pesadas

Permite identificar dónde optimizar.

---


# 9. 💾 Respaldos y recuperación


### ✔ Backups en Supabase
Desde el panel:
> Database → Backups

Incluye:
- Copias diarias automáticas  
- PITR (Point In Time Recovery)  
- Descarga de archivos `.sql`

### ✔ Alternativa externa (Render o servidor)
Script:
```
pg_dump -h host -U user -F p dbname | gzip > backup.sql.gz
```

Programación con cron:
```
0 2 * * * backup.sh
```

Cumple con:
👉 *“Políticas de backup verificadas y funcionales”*.

---


# 10. 📘 Manual de Base de Datos


Incluye:

### 📄 Estructura de tablas
- Atributos
- Relación entre entidades
- Integridad referencial

### 🔐 Seguridad
- Hash bcrypt
- Cifrado simétrico
- Políticas RLS por rol

### 🧰 Administración
- Creación y asignación de roles
- Administración de accesos
- Revocación de permisos

### 💾 Respaldo
- Configuración de backups automáticos
- Restauración manual y automática

### 📊 Monitoreo
- Uso de `top_queries_lentas`
- Detección de cuellos de botella

---