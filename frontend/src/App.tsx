import { useEffect, useState } from "react";
import "./App.css";
import { api, ensureCsrfCookie } from "./api";
import LoginRegistro from "./components/LoginRegistro";
import HistorialCrediticio from "./components/HistorialCrediticio";
import SociosViewer from "./components/SociosViewer";
import type { SocioDto } from "./components/SociosViewer";
import logo from "./assets/logo-cooprestamos-vector.svg";
import avatarFallback from "./assets/solo-logo-cooprestamos-vector.svg";

const currency = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

const Loader = () => (
  <div className="loader">
    <div className="loader__card" role="status" aria-live="polite">
      <div className="loader__logo">
        <img src={logo} alt="Logo Cooprestamos" />
      </div>
      <p className="loader__name">COOPRESTAMOS</p>
      <p className="loader__status">
        Cargando
        <span className="loader__dots" aria-hidden="true">
          <span className="loader__dot">.</span>
          <span className="loader__dot">.</span>
          <span className="loader__dot">.</span>
        </span>
      </p>
    </div>
  </div>
);

function App() {
  const [usuario, setUsuario] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [vistaActiva, setVistaActiva] = useState<"home" | "socios" | "historial">("home");
  const [ultimosSocios, setUltimosSocios] = useState<SocioDto[]>([]);
  const [ultimosPrestamos, setUltimosPrestamos] = useState<any[]>([]);
  const [actividadReciente, setActividadReciente] = useState<any[]>([]);

  useEffect(() => {
    const verificarSesion = async () => {
      try {
        await ensureCsrfCookie();
        const response = await api.get("auth/usuario-actual/");
        setUsuario(response.data);
      } catch (_err) {
        setUsuario(null);
      } finally {
        setLoading(false);
      }
    };

    void verificarSesion();
  }, []);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const { data: socios } = await api.get<SocioDto[]>("socios");
        const ordenados = [...socios].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setUltimosSocios(ordenados.slice(0, 4));

        const { data: historial } = await api.get<any>("socios/historial/");
        const prestamos = (historial?.prestamos ?? []).sort(
          (a: any, b: any) => new Date(b.fecha_desembolso).getTime() - new Date(a.fecha_desembolso).getTime()
        );
        setUltimosPrestamos(prestamos.slice(0, 4));

        const { data: actividad } = await api.get<any[]>("socios/actividad-admin/");
        setActividadReciente(actividad);
      } catch (err) {
        console.error("No se pudo cargar panel", err);
      }
    };
    void fetchDashboard();
  }, []);

  const handleLogout = async () => {
    try {
      await api.post("auth/logout/");
    } catch (_err) {
      try {
        await api.get("auth/logout/");
      } catch (fallbackErr) {
        console.error("Error al cerrar sesion (fallback):", fallbackErr);
      }
    } finally {
      setUsuario(null);
      window.location.reload();
    }
  };

  if (loading) {
    return <Loader />;
  }

  if (!usuario) {
    return <LoginRegistro />;
  }

  type Accion = {
    titulo: string;
    descripcion: string;
    icono: string;
    variante: string;
    onClick?: () => void;
    cta?: string;
  };

  const acciones: Accion[] = [
     {
       titulo: "Socios",
       descripcion: "Altas, bajas, estados y datos fiscales.",
       icono: "bx-id-card",
       variante: "outline",
       onClick: () => setVistaActiva("socios"),
       cta: "Abrir socios",
     },
    {
      titulo: "Historial crediticio",
      descripcion: "Movimientos, pagos y conciliacion.",
      icono: "bx-credit-card",
      variante: "outline",
      onClick: () => setVistaActiva("historial"),
      cta: "Ver historial",
    },
    {
      titulo: "Reportes",
      descripcion: "Indicadores diarios y cierres mensuales.",
      icono: "bx-bar-chart-alt-2",
      variante: "outline",
    },
    {
      titulo: "Configuracion",
      descripcion: "Parametros, roles y accesos.",
      icono: "bx-cog",
      variante: "outline",
    },
    {
      titulo: "Auditoria",
      descripcion: "Trazas de acciones y seguridad.",
      icono: "bx-shield-alt-2",
      variante: "outline",
    },
    {
      titulo: "Usuarios",
      descripcion: "Credenciales y permisos internos.",
      icono: "bx-user-circle",
      variante: "outline",
    },
  ];

  const nombreParaMostrar = usuario?.nombre ?? usuario?.email ?? "Admin";
  const kpis = [
    { titulo: "Socios activos", valor: "128", detalle: "+4 esta semana", icono: "bx-user-check" },
    { titulo: "Prestamos en curso", valor: "42", detalle: "12 en revision", icono: "bx-bank" },
    { titulo: "Alertas del sistema", valor: "3", detalle: "1 critica, 2 medias", icono: "bx-bell" },
    { titulo: "Pendientes del admin", valor: "5", detalle: "2 tickets, 3 tareas", icono: "bx-clipboard" },
  ];
  const formatFechaRelativa = (fechaIso: string) => {
    const fecha = new Date(fechaIso);
    const ahora = new Date();
    const diffMs = ahora.getTime() - fecha.getTime();
    const diffHoras = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHoras < 24) {
      return `hoy ${fecha.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    }
    return `ayer ${fecha.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  };

  const badgeEstadoPrestamo = (estado: string) => {
    if (estado === "pagado" || estado === "aprobado") return "success";
    if (estado === "moroso" || estado === "rechazado") return "warning";
    if (estado === "activo" || estado === "revision") return "info";
    return "info";
  };

  return (
    <div className="admin-shell">
      <header className="topbar">
        <div className="brand">
          <img src={logo} alt="Cooprestamos logo" />
          <div>
            <p className="brand__eyebrow">Panel Administrador</p>
            <p className="brand__name">Cooprestamos</p>
          </div>
        </div>
        <div className="topbar__right">
          <div className="user-chip" aria-label={`Sesion iniciada como ${nombreParaMostrar}`}>
            <div className="user-chip__avatar">
              <img src={avatarFallback} alt="Avatar admin" />
            </div>
            <div>
              <p className="user-chip__label">Admin</p>
              <p className="user-chip__name">{nombreParaMostrar}</p>
            </div>
          </div>
          <button className="ghost" onClick={() => setVistaActiva("home")}>
            Inicio
          </button>
          <button className="danger" onClick={handleLogout}>
            Cerrar sesion
          </button>
        </div>
      </header>

      {vistaActiva === "home" ? (
        <main className="admin-container">
          <div className="page-header">
            <div>
              <p className="eyebrow">Administracion</p>
              <h1>Panel de control</h1>
              <p className="subtitle">
                Sesion activa: <strong>{usuario.email}</strong>. Auditoria y trazabilidad habilitadas. Ultima
                sincronizacion: hace 3 minutos.
              </p>
            </div>
            <div className="header-meta">
              <p>Servidor: <strong>Operativo</strong></p>
              <p>Alertas abiertas: <strong>3</strong></p>
            </div>
          </div>

          <div className="metrics-grid" aria-label="Indicadores clave del panel">
            {kpis.map((kpi) => (
              <article key={kpi.titulo} className="metric-card">
                <div className="metric-card__icon">
                  <i className={`bx ${kpi.icono} bx-tada-hover`} aria-hidden="true" />
                </div>
                <div className="metric-card__body">
                  <h3>{kpi.titulo}</h3>
                  <p className="metric-card__value">{kpi.valor}</p>
                  <p className="metric-card__delta">{kpi.detalle}</p>
                </div>
              </article>
            ))}
          </div>

          <section className="actions-grid" aria-label="Accesos a modulos">
            {acciones.map((accion) => (
              <article
                key={accion.titulo}
                className={`action-card action-card--${accion.variante} ${
                  accion.onClick ? "action-card--clickable" : "action-card--muted"
                }`}
                role={accion.onClick ? "button" : "article"}
                tabIndex={accion.onClick ? 0 : -1}
                onClick={accion.onClick}
                onKeyDown={(e) => {
                  if (accion.onClick && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    accion.onClick();
                  }
                }}
                aria-label={accion.titulo}
              >
                <div className="action-card__icon">
                  <i className={`bx ${accion.icono} bx-tada-hover`} aria-hidden="true" />
                </div>
                <div className="action-card__meta">
                  <h3>{accion.titulo}</h3>
                  <p>{accion.descripcion}</p>
                </div>
                {accion.cta && <span className="action-card__cta">{accion.cta}</span>}
              </article>
            ))}
          </section>

          <div className="section-grid">
            <section className="panel-section" aria-label="Ultimos socios">
              <h2>Ultimos socios registrados</h2>
              <p className="section-description">Altas de las ultimas 24 horas procesadas por el equipo.</p>
              <table className="list-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Documento</th>
                    <th>Estado</th>
                    <th>Alta</th>
                  </tr>
                </thead>
                <tbody>
                  {ultimosSocios.map((socio) => (
                    <tr key={socio.id}>
                      <td>{socio.nombre_completo}</td>
                      <td>{socio.documento ?? "-"}</td>
                      <td>
                        <span className={`status ${socio.estado === "activo" ? "success" : "warning"}`}>
                          {socio.estado}
                        </span>
                      </td>
                      <td>{formatFechaRelativa(socio.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="panel-section" aria-label="Ultimos prestamos">
              <h2>Ultimos prestamos procesados</h2>
              <p className="section-description">Movimientos recientes de credito y decisiones.</p>
              <table className="list-table">
                <thead>
                  <tr>
                    <th>Socio</th>
                    <th>Monto</th>
                    <th>Estado</th>
                    <th>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {ultimosPrestamos.map((prestamo) => (
                    <tr key={prestamo.id}>
                      <td>{prestamo.socio_nombre || "-"}</td>
                      <td>{currency.format(Number(prestamo.monto))}</td>
                      <td>
                        <span className={`status ${badgeEstadoPrestamo(prestamo.estado)}`}>{prestamo.estado}</span>
                      </td>
                      <td>{prestamo.fecha_desembolso}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>

          <section className="panel-section" aria-label="Actividad reciente del administrador">
            <h2>Actividad reciente del admin</h2>
            <p className="section-description">Ultimos cambios ejecutados desde esta cuenta.</p>
            <ul className="activity-list">
              {actividadReciente.length === 0 && <li className="activity-item">Sin actividad reciente.</li>}
              {actividadReciente.map((item, idx) => (
                <li key={`${item.accion}-${idx}`} className="activity-item">
                  <span>
                    {item.accion} {item.socio ? `sobre ${item.socio}` : ""}
                  </span>
                  <span className="activity-meta">{formatFechaRelativa(item.fecha)}</span>
                </li>
              ))}
            </ul>
          </section>
        </main>
      ) : vistaActiva === "socios" ? (
        <main className="admin-container">
          <div className="page-header">
            <div>
              <p className="eyebrow">Gestion</p>
              <h1>Socios</h1>
              <p className="subtitle">Consulta, edita y administra a los socios registrados.</p>
            </div>
            <div className="header-meta">
              <button className="ghost" onClick={() => setVistaActiva("home")}>
                <i className="bx bx-chevron-left" aria-hidden="true" />
                Volver al inicio
              </button>
            </div>
          </div>
          <SociosViewer />
        </main>
      ) : (
        <main className="admin-container">
          <div className="page-header">
            <div>
              <p className="eyebrow">Riesgo</p>
              <h1>Historial crediticio</h1>
              <p className="subtitle">
                Consulta préstamos anteriores y pagos antes de autorizar un nuevo crédito.
              </p>
            </div>
            <div className="header-meta">
              <button className="ghost" onClick={() => setVistaActiva("home")}>
                <i className="bx bx-chevron-left" aria-hidden="true" />
                Volver al inicio
              </button>
            </div>
          </div>
          <HistorialCrediticio />
        </main>
      )}

      <footer className="admin-footer">Cooprestamos - Panel Administrador - {new Date().getFullYear()}</footer>
    </div>
  );
}

export default App;
