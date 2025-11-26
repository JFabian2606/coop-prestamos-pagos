import { useEffect, useState } from "react";
import "./App.css";
import { api } from "./api";
import LoginRegistro from "./components/LoginRegistro";
import SociosViewer from "./components/SociosViewer";

function App() {
  const [usuario, setUsuario] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar si hay sesion activa
    const verificarSesion = async () => {
      try {
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
    return <div>Cargando...</div>;
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
