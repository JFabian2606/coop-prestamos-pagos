import { useEffect, useState } from "react";
import "./App.css";
import { api, ensureCsrfCookie } from "./api";
import LoginRegistro from "./components/LoginRegistro";
import SociosViewer from "./components/SociosViewer";
import logo from "./assets/logo-cooprestamos-vector.svg";
import avatarFallback from "./assets/solo-logo-cooprestamos-vector.svg";

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
  const [vistaActiva, setVistaActiva] = useState<"home" | "socios">("home");

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

  const nombreParaMostrar = usuario?.nombre ?? usuario?.email ?? "Admin";
  const kpis = [
    { titulo: "Socios activos", valor: "128", detalle: "+4 esta semana", icono: "bxs-user-check" },
    { titulo: "Prestamos en curso", valor: "42", detalle: "12 en revision", icono: "bxs-bank" },
    { titulo: "Alertas del sistema", valor: "3", detalle: "1 critica, 2 medias", icono: "bxs-bell-ring" },
    { titulo: "Pendientes del admin", valor: "5", detalle: "2 tickets, 3 tareas", icono: "bxs-clipboard" },
  ];
  const ultimosSocios = [
    { nombre: "Ana Gutierrez", documento: "CC 102345", estado: "activo", alta: "hoy 09:18" },
    { nombre: "Luis Andrade", documento: "CC 954221", estado: "activo", alta: "ayer 18:42" },
    { nombre: "Bruno Soto", documento: "CE 781233", estado: "inactivo", alta: "ayer 15:27" },
    { nombre: "Karen Mendez", documento: "CC 223411", estado: "activo", alta: "ayer 11:06" },
  ];
  const ultimosPrestamos = [
    { socio: "Ana Gutierrez", monto: "$4.500.000", estado: "aprobado", fecha: "hoy 10:02" },
    { socio: "Luis Andrade", monto: "$2.300.000", estado: "revision", fecha: "hoy 08:55" },
    { socio: "Bruno Soto", monto: "$1.200.000", estado: "rechazado", fecha: "ayer 19:14" },
    { socio: "Karen Mendez", monto: "$3.700.000", estado: "aprobado", fecha: "ayer 16:48" },
  ];
  const actividad = [
    { evento: "Actualizaste datos fiscales de Luis Andrade", hora: "hoy 10:24" },
    { evento: "Exportaste reporte de socios activos", hora: "hoy 09:51" },
    { evento: "Cambiaste estado de Karen Mendez a activo", hora: "ayer 18:33" },
    { evento: "Revisaste alertas de integracion bancaria", hora: "ayer 17:05" },
  ];

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
            {[
              {
                titulo: "Socios",
                descripcion: "Altas, bajas, estados y datos fiscales.",
                icono: "bxs-user-detail",
                variante: "primary",
                onClick: () => setVistaActiva("socios"),
                cta: "Abrir socios",
              },
              {
                titulo: "Creditos y cobranzas",
                descripcion: "Movimientos, pagos y conciliacion.",
                icono: "bxs-credit-card",
                variante: "outline",
              },
              {
                titulo: "Reportes",
                descripcion: "Indicadores diarios y cierres mensuales.",
                icono: "bxs-bar-chart-alt-2",
                variante: "outline",
              },
              {
                titulo: "Configuracion",
                descripcion: "Parametros, roles y accesos.",
                icono: "bxs-cog",
                variante: "outline",
              },
              {
                titulo: "Auditoria",
                descripcion: "Trazas de acciones y seguridad.",
                icono: "bxs-shield",
                variante: "outline",
              },
              {
                titulo: "Usuarios",
                descripcion: "Credenciales y permisos internos.",
                icono: "bxs-user-badge",
                variante: "outline",
              },
            ].map((accion) => (
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
                    <tr key={socio.documento}>
                      <td>{socio.nombre}</td>
                      <td>{socio.documento}</td>
                      <td>
                        <span className={`status ${socio.estado === "activo" ? "success" : "warning"}`}>
                          {socio.estado}
                        </span>
                      </td>
                      <td>{socio.alta}</td>
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
                  {ultimosPrestamos.map((prestamo, idx) => (
                    <tr key={`${prestamo.socio}-${idx}`}>
                      <td>{prestamo.socio}</td>
                      <td>{prestamo.monto}</td>
                      <td>
                        <span
                          className={`status ${
                            prestamo.estado === "aprobado"
                              ? "success"
                              : prestamo.estado === "revision"
                                ? "info"
                                : "warning"
                          }`}
                        >
                          {prestamo.estado}
                        </span>
                      </td>
                      <td>{prestamo.fecha}</td>
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
              {actividad.map((item, idx) => (
                <li key={`${item.evento}-${idx}`} className="activity-item">
                  <span>{item.evento}</span>
                  <span className="activity-meta">{item.hora}</span>
                </li>
              ))}
            </ul>
          </section>
        </main>
      ) : (
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
      )}

      <footer className="admin-footer">Cooprestamos - Panel Administrador - {new Date().getFullYear()}</footer>
    </div>
  );
}

export default App;
