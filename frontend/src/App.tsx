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
    // Verificar si hay sesion activa
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

    verificarSesion();
  }, []);

  const handleLogout = async () => {
    try {
      await api.post("auth/logout/");
    } catch (_err) {
      // Algunos proxies cambian POST a GET al redirigir (http -> https), probamos GET como respaldo
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
        <main className="admin-home">
          <section className="hero">
            <div>
              <p className="eyebrow">Bienvenido, {nombreParaMostrar.split("@")[0] ?? "Admin"}</p>
              <h1>Gestiona Cooprestamos desde un solo lugar</h1>
              <p className="subtitle">
                Elige una accion para administrar socios, revisar reportes o configurar el panel con confianza.
              </p>
              <div className="hero__pills">
                <span className="pill">
                  <i className="bx bxs-check-shield bx-tada-hover" aria-hidden="true" />
                  Operaciones auditadas
                </span>
                <span className="pill">
                  <i className="bx bxs-bell-ring bx-tada-hover" aria-hidden="true" />
                  Alertas en tiempo real
                </span>
              </div>
            </div>
            <div className="hero__badge">
              <p className="hero__badge-title">Estado del sistema</p>
              <p className="hero__badge-value">
                <i className="bx bxs-circle" aria-hidden="true" />
                Operativo
              </p>
              <p className="hero__badge-meta">Sesion segura y protegida</p>
            </div>
          </section>

          <section className="actions-grid" aria-label="Acciones disponibles para el administrador">
            {[
              {
                titulo: "Socios",
                descripcion: "Gestiona altas, estados y datos fiscales de los socios.",
                icono: "bxs-user-detail",
                variante: "primary",
                onClick: () => setVistaActiva("socios"),
                cta: "Ir a socios",
              },
              {
                titulo: "Historial crediticio",
                descripcion: "Consulta y conecta el historial de prestamos.",
                icono: "bxs-hand",
                variante: "outline",
              },
              {
                titulo: "Reportes",
                descripcion: "Explora metricas y reportes clave.",
                icono: "bxs-bar-chart-alt-2",
                variante: "outline",
              },
              {
                titulo: "Configuracion",
                descripcion: "Define parametros y roles del panel.",
                icono: "bxs-cog",
                variante: "outline",
              },
              {
                titulo: "Auditoria",
                descripcion: "Revisa trazas y logs de seguridad.",
                icono: "bxs-file-find",
                variante: "outline",
              },
              {
                titulo: "Usuarios",
                descripcion: "Administra credenciales y permisos.",
                icono: "bxs-id-card",
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
        </main>
      ) : (
        <main className="module">
          <div className="module__header">
            <div>
              <p className="eyebrow">Gestion</p>
              <h2>Socios</h2>
              <p className="subtitle">Consulta, edita y administra a los socios registrados.</p>
            </div>
            <div className="module__actions">
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
