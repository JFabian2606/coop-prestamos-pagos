import { useEffect, useState } from "react";
import "./App.css";
import { api, ensureCsrfCookie } from "./api";
import LoginRegistro from "./components/LoginRegistro";
import SociosViewer from "./components/SociosViewer";
import logo from "./assets/logo-cooprestamos-vector.svg";

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

  useEffect(() => {
    // Verificar si hay sesion activa
    const verificarSesion = async () => {
      try {
        await ensureCsrfCookie();
        const response = await api.get("auth/usuario-actual/");
        setUsuario(response.data);
      } catch (err) {
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

  return (
    <div className="dashboard">
      <header className="dashboard__header">
        <div>
          <p className="eyebrow">Panel seguro</p>
          <h1>Administracion de socios</h1>
          <p className="subtitle">
            Sesion iniciada como <strong>{usuario.email}</strong>. Todas las operaciones quedan auditadas.
          </p>
        </div>
        <div className="dashboard__cta">
          <button className="danger" onClick={handleLogout}>
            Cerrar sesion
          </button>
        </div>
      </header>

      <SociosViewer />
    </div>
  );
}

export default App;
