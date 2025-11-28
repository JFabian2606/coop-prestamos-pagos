import { useEffect, useState } from "react";
import "./App.css";
import { api } from "./api";
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
      <p className="loader__name">SISTEMA INTEGRAL</p>
      <p className="loader__status">
        Inicializando módulos
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
  // MOCK USER FOR UI DEVELOPMENT - REMOVE BEFORE PRODUCTION
  const [usuario, setUsuario] = useState<any>({
    nombre: "Carlos Rodriguez",
    email: "admin@cooprestamos.com",
    rol: "superadmin"
  });
  const [loading, setLoading] = useState(false); // Set to false for dev
  const [vistaActiva, setVistaActiva] = useState<"home" | "socios">("home");

  useEffect(() => {
    // Verificar si hay sesion activa
    // Verificar si hay sesion activa
    /*
    const verificarSesion = async () => {
      try {
        await ensureCsrfCookie();
        const response = await api.get("auth/usuario-actual/");
        setUsuario(response.data);
      } catch (_err) {
        // Fallback to mock if backend fails during UI dev
        // setUsuario(null); 
      } finally {
        setLoading(false);
      }
    };

    verificarSesion(); 
    */
    setLoading(false); // Ensure loading is set to false immediately for mock
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

  const nombreParaMostrar = usuario?.nombre ?? usuario?.email ?? "Administrador";

  // DATOS REALES / SIMULADOS
  const kpis = [
    { titulo: "Capital Social", valor: "$1.240.500.000", detalle: "▲ 2.4% vs mes anterior", icono: "bxs-bank" },
    { titulo: "Cartera Activa", valor: "$850.200.000", detalle: "142 préstamos vigentes", icono: "bxs-wallet" },
    { titulo: "Mora > 30 días", valor: "4.2%", detalle: "▼ 0.5% recuperación", icono: "bxs-error-circle" },
    { titulo: "Socios Habilitados", valor: "1,248", detalle: "12 nuevas altas este mes", icono: "bxs-group" },
  ];

  const ultimosSocios = [
    { id: "S-2024-089", nombre: "Ana Gutiérrez", documento: "1.023.456.789", estado: "Verificado", fecha: "27/11/2025" },
    { id: "S-2024-088", nombre: "Luis Andrade", documento: "98.542.210", estado: "Pendiente", fecha: "26/11/2025" },
    { id: "S-2024-087", nombre: "Bruno Soto", documento: "CE 781.233", estado: "Bloqueado", fecha: "26/11/2025" },
    { id: "S-2024-086", nombre: "Karen Méndez", documento: "22.341.109", estado: "Verificado", fecha: "25/11/2025" },
    { id: "S-2024-085", nombre: "Jorge Pineda", documento: "80.123.456", estado: "Verificado", fecha: "25/11/2025" },
  ];

  const ultimosPrestamos = [
    { ref: "CRED-4002", socio: "Ana Gutiérrez", monto: "$4.500.000", plazo: "24 meses", estado: "Desembolsado" },
    { ref: "CRED-4001", socio: "Luis Andrade", monto: "$2.300.000", plazo: "12 meses", estado: "Análisis Riesgo" },
    { ref: "CRED-3999", socio: "Bruno Soto", monto: "$1.200.000", plazo: "6 meses", estado: "Rechazado" },
    { ref: "CRED-3998", socio: "Karen Méndez", monto: "$3.700.000", plazo: "36 meses", estado: "Aprobado" },
    { ref: "CRED-3997", socio: "Pedro Alcantara", monto: "$5.000.000", plazo: "48 meses", estado: "Desembolsado" },
  ];

  const actividad = [
    { evento: "Actualización tasa de interés global", usuario: "Carlos Rodriguez", ip: "192.168.1.15", hora: "10:24 AM" },
    { evento: "Cierre contable mensual - Octubre", usuario: "Sistema", ip: "Automático", hora: "09:51 AM" },
    { evento: "Aprobación excepción de crédito #3998", usuario: "Maria Gerencia", ip: "192.168.1.20", hora: "09:15 AM" },
    { evento: "Bloqueo preventivo socio S-2024-087", usuario: "Carlos Rodriguez", ip: "192.168.1.15", hora: "08:30 AM" },
  ];

  return (
    <div className="admin-shell">
      <header className="topbar">
        <div className="brand">
          <img src={logo} alt="Cooprestamos logo" />
          <div className="brand__text">
            <p className="brand__system">SISTEMA DE GESTIÓN</p>
            <p className="brand__company">COOPRESTAMOS</p>
          </div>
        </div>
        <div className="topbar__right">
          <div className="system-status">
            <span className="status-indicator online"></span>
            <span>Conectado</span>
          </div>
          <div className="user-profile" aria-label="Menú de usuario">
            <div className="user-profile__info">
              <p className="user-profile__name">{nombreParaMostrar}</p>
              <p className="user-profile__role">Administrador General</p>
            </div>
            <div className="user-profile__avatar">
              <img src={avatarFallback} alt="Avatar" />
            </div>
          </div>
          <button className="btn-logout" onClick={handleLogout} title="Cerrar sesión">
            <i className='bx bx-power-off'></i>
          </button>
        </div>
      </header>

      {vistaActiva === "home" ? (
        <main className="admin-container">
          <div className="dashboard-header">
            <h1 className="page-title">Panel de Control</h1>
            <div className="dashboard-controls">
              <span className="last-update">Actualizado: Hoy, 10:45 AM</span>
              <button className="btn-secondary"><i className='bx bx-refresh'></i> Actualizar</button>
              <button className="btn-primary"><i className='bx bx-plus'></i> Nuevo Préstamo</button>
            </div>
          </div>

          <div className="metrics-grid">
            {kpis.map((kpi) => (
              <article key={kpi.titulo} className="metric-card">
                <div className="metric-card__header">
                  <h3>{kpi.titulo}</h3>
                  <i className={`bx ${kpi.icono}`} aria-hidden="true" />
                </div>
                <div className="metric-card__body">
                  <p className="metric-card__value">{kpi.valor}</p>
                  <p className="metric-card__delta">{kpi.detalle}</p>
                </div>
              </article>
            ))}
          </div>

          <div className="main-grid">
            <div className="grid-col-left">
              <section className="panel-section">
                <div className="section-header">
                  <h2>Solicitudes Recientes</h2>
                  <a href="#" className="link-action">Ver todas</a>
                </div>
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Ref</th>
                        <th>Socio</th>
                        <th>Monto</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ultimosPrestamos.map((p) => (
                        <tr key={p.ref}>
                          <td className="mono">{p.ref}</td>
                          <td>{p.socio}</td>
                          <td className="mono">{p.monto}</td>
                          <td>
                            <span className={`badge ${p.estado.toLowerCase().replace(" ", "-")}`}>
                              {p.estado}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="panel-section">
                <div className="section-header">
                  <h2>Últimos Socios Registrados</h2>
                  <a href="#" className="link-action">Directorio</a>
                </div>
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Nombre</th>
                        <th>Documento</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ultimosSocios.map((s) => (
                        <tr key={s.id}>
                          <td className="mono">{s.id}</td>
                          <td>{s.nombre}</td>
                          <td className="mono">{s.documento}</td>
                          <td>
                            <span className={`status-dot ${s.estado.toLowerCase()}`}></span>
                            {s.estado}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>

            <div className="grid-col-right">
              <section className="panel-section quick-actions">
                <h2>Accesos Rápidos</h2>
                <div className="actions-list">
                  <button className="action-tile" onClick={() => setVistaActiva("socios")}>
                    <i className='bx bxs-user-detail'></i>
                    <span>Gestión de Socios</span>
                  </button>
                  <button className="action-tile">
                    <i className='bx bxs-calculator'></i>
                    <span>Simulador Crédito</span>
                  </button>
                  <button className="action-tile">
                    <i className='bx bxs-report'></i>
                    <span>Reportes Financieros</span>
                  </button>
                  <button className="action-tile">
                    <i className='bx bxs-cog'></i>
                    <span>Configuración</span>
                  </button>
                </div>
              </section>

              <section className="panel-section activity-log">
                <h2>Registro de Actividad</h2>
                <ul className="log-list">
                  {actividad.map((a, i) => (
                    <li key={i} className="log-item">
                      <div className="log-icon"><i className='bx bx-radio-circle-marked'></i></div>
                      <div className="log-content">
                        <p className="log-text">{a.evento}</p>
                        <p className="log-meta">{a.usuario} • {a.hora}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </div>

        </main>
      ) : (
        <main className="admin-container">
          <div className="dashboard-header">
            <div>
              <h1 className="page-title">Directorio de Socios</h1>
              <p className="page-subtitle">Gestión integral de la base social</p>
            </div>
            <button className="btn-secondary" onClick={() => setVistaActiva("home")}>
              <i className="bx bx-arrow-back" /> Volver al Panel
            </button>
          </div>
          <SociosViewer />
        </main>
      )}

      <footer className="admin-footer">
        <p>© 2025 Cooprestamos v2.4.0 | Sistema de Gestión Financiera</p>
        <p className="footer-meta">Servidor: AWS-US-EAST-1 | Latencia: 45ms</p>
      </footer>
    </div>
  );
}

export default App;
