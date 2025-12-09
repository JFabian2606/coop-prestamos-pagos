import { useEffect, useState } from "react";
import "./App.css";
import { api, ensureCsrfCookie } from "./api";
import LoginRegistro from "./components/LoginRegistro";
import HistorialCrediticio from "./components/HistorialCrediticio";
import SociosViewer from "./components/SociosViewer";
import TiposPrestamo from "./components/TiposPrestamo";
import PoliticasAprobacion from "./components/PoliticasAprobacion";
import LandingHome from "./components/LandingHome";
import SolicitudPrestamo from "./components/SolicitudPrestamo";
import UsuariosRoles from "./components/UsuariosRoles";
import TesoreroPanel from "./components/TesoreroPanel";
import AnalistaPanel from "./components/AnalistaPanel";
import MisPrestamos from "./components/MisPrestamos";
import type { SocioDto } from "./components/SociosViewer";
import logo from "./assets/solo-logo-cooprestamos-vector.svg";
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
  const [vistaActiva, setVistaActiva] = useState<"home" | "socios" | "historial" | "tipos" | "configuracion" | "usuarios" | "landing">("home");
  const [vistaSocio, setVistaSocio] = useState<"landing" | "solicitud" | "prestamos">("landing");
  const [ultimosSocios, setUltimosSocios] = useState<SocioDto[]>([]);
  const [ultimosPrestamos, setUltimosPrestamos] = useState<any[]>([]);
  const [actividadReciente, setActividadReciente] = useState<any[]>([]);
  const [totalSocios, setTotalSocios] = useState<number | null>(null);
  const [totalSociosActivos, setTotalSociosActivos] = useState<number | null>(null);
  const [prestamosTotales, setPrestamosTotales] = useState<number | null>(null);
  const [prestamosEnCurso, setPrestamosEnCurso] = useState<number | null>(null);

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
    if (!usuario?.is_staff) return;
    const fetchDashboard = async () => {
      try {
        const { data: socios } = await api.get<SocioDto[]>("socios");
        const ordenados = [...socios].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setUltimosSocios(ordenados.slice(0, 4));
        setTotalSocios(socios.length);
        setTotalSociosActivos(socios.filter((s) => s.estado === "activo").length);

        const { data: historial } = await api.get<any>("socios/historial/");
        const prestamos = (historial?.prestamos ?? []).sort(
          (a: any, b: any) => new Date(b.fecha_desembolso).getTime() - new Date(a.fecha_desembolso).getTime()
        );
        setUltimosPrestamos(prestamos.slice(0, 4));
        setPrestamosTotales(prestamos.length);
        const activosDesdeResumen =
          typeof historial?.resumen?.prestamos_activos === "number" ? historial.resumen.prestamos_activos : null;
        const enCursoCalculados =
          activosDesdeResumen ?? prestamos.filter((p: any) => p.estado === "activo" || p.estado === "moroso").length;
        setPrestamosEnCurso(enCursoCalculados);

        const { data: actividad } = await api.get<any[]>("socios/actividad-admin/");
        setActividadReciente(actividad);
      } catch (err) {
        console.error("No se pudo cargar panel", err);
      }
    };
    void fetchDashboard();
  }, [usuario]);

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

  const rolNombre = (usuario?.rol ?? "").toString();
  const isAnalista = rolNombre.toUpperCase() === "ANALISTA";
  const isTesorero = rolNombre.toUpperCase() === "TESORERO";
  const isAdmin = Boolean(usuario?.is_staff);

  // Si el usuario no es staff/admin ni analista, mostramos la landing pública para socios.
  if (!isAdmin && !isAnalista && !isTesorero) {
    if (vistaSocio === "solicitud") {
      return <SolicitudPrestamo usuario={usuario} onVolver={() => setVistaSocio("landing")} />;
    }
    if (vistaSocio === "prestamos") {
      return (
        <MisPrestamos
          usuario={usuario}
          onSolicitar={() => setVistaSocio("solicitud")}
          onVolver={() => setVistaSocio("landing")}
        />
      );
    }
    return (
      <LandingHome
        onSolicitar={() => setVistaSocio("solicitud")}
        onMisPrestamos={() => setVistaSocio("prestamos")}
        onLogout={handleLogout}
      />
    );
  }

  if (isAnalista && !isAdmin) {
    return <AnalistaPanel usuario={usuario} onLogout={handleLogout} />;
  }

  if (isTesorero && !isAdmin) {
    return <TesoreroPanel usuario={usuario} onLogout={handleLogout} />;
  }

  type Accion = {
    titulo: string;
    descripcion: string;
    icono: string;
    variante: string;
    onClick?: () => void;
    cta?: string;
  };

  type Kpi = {
    titulo: string;
    valor: string;
    detalle: string;
    icono?: string;
    iconoSvg?: JSX.Element;
  };

  const acciones: Accion[] = [
     {
       titulo: "Socios",
       descripcion: "Altas, bajas, estados y datos fiscales.",
       icono: "bx-id-card",
       variante: "outline",
       onClick: () => setVistaActiva("socios"),
       cta: "Ver socios",
     },
    {
      titulo: "Tipos de prestamo",
      descripcion: "Define tasas, plazos y requisitos.",
      icono: "bx-slider-alt",
      variante: "outline",
      onClick: () => setVistaActiva("tipos"),
      cta: "Configurar",
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
      descripcion: "Políticas de aceptación.",
      icono: "bx-cog",
      variante: "outline",
      onClick: () => setVistaActiva("configuracion"),
      cta: "Políticas",
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
      onClick: () => setVistaActiva("usuarios"),
      cta: "Ver roles",
    },
  ];

  const nombreParaMostrar = usuario?.nombre ?? usuario?.email ?? "Admin";
  const kpis: Kpi[] = [
    {
      titulo: "Socios activos",
      valor: totalSociosActivos !== null ? String(totalSociosActivos) : "...",
      detalle: totalSocios !== null ? `${totalSocios} registrados` : "Cargando...",
      icono: "bx-user-check",
    },
    {
      titulo: "Prestamos en curso",
      valor: prestamosEnCurso !== null ? String(prestamosEnCurso) : "...",
      detalle: prestamosTotales !== null ? `${prestamosTotales} en total` : "Cargando...",
      iconoSvg: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden="true"
          width="26"
          height="26"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z"
          />
        </svg>
      ),
    },
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
                  {kpi.iconoSvg ? (
                    <span className="metric-card__svg bx-tada-hover" aria-hidden="true">
                      {kpi.iconoSvg}
                    </span>
                  ) : (
                    <i className={`bx ${kpi.icono} bx-tada-hover`} aria-hidden="true" />
                  )}
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
      ) : vistaActiva === "tipos" ? (
        <main className="admin-container">
          <div className="page-header">
            <div>
              <p className="eyebrow">Configuracion</p>
              <h1>Tipos de prestamo</h1>
              <p className="subtitle">Administra tasas, plazos y requisitos por producto.</p>
            </div>
            <div className="header-meta">
              <button className="ghost" onClick={() => setVistaActiva("home")}>
                <i className="bx bx-chevron-left" aria-hidden="true" />
                Volver al inicio
              </button>
            </div>
          </div>
          <TiposPrestamo />
        </main>
      ) : vistaActiva === "configuracion" ? (
        <main className="admin-container">
          <div className="page-header">
            <div>
              <p className="eyebrow">Configuracion</p>
              <h1>Políticas de aprobación</h1>
              <p className="subtitle">Define reglas automáticas por score, antigüedad y capacidad de pago.</p>
            </div>
            <div className="header-meta">
              <button className="ghost" onClick={() => setVistaActiva("home")}>
                <i className="bx bx-chevron-left" aria-hidden="true" />
                Volver al inicio
              </button>
            </div>
          </div>
          <PoliticasAprobacion />
        </main>
      ) : vistaActiva === "usuarios" ? (
        <main className="admin-container">
          <div className="page-header">
            <div>
              <p className="eyebrow">Usuarios</p>
              <h1>Roles y permisos</h1>
              <p className="subtitle">Asignar rol (socio, cajero, analista, admin) a cada cuenta.</p>
            </div>
            <div className="header-meta">
              <button className="ghost" onClick={() => setVistaActiva("home")}>
                <i className="bx bx-chevron-left" aria-hidden="true" />
                Volver al inicio
              </button>
            </div>
          </div>
          <UsuariosRoles />
        </main>
      ) : vistaActiva === "landing" ? (
        <LandingHome />
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
