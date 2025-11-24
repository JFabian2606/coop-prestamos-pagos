import { useEffect, useState } from "react";
import "./App.css";
import { api } from "./api";
import LoginRegistro from "./components/LoginRegistro";
import SociosViewer from "./components/SociosViewer";

function App() {
  const [usuario, setUsuario] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar si hay sesión activa
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

  if (loading) {
    return <div>Cargando...</div>;
  }

  if (!usuario) {
    return (
      <div style={{ maxWidth: 920, margin: "2rem auto" }}>
        <LoginRegistro />
      </div>
    );
  }

  return (
    <div className="dashboard">
      <header className="dashboard__header">
        <div>
          <p className="eyebrow">Panel seguro</p>
          <h1>Administración de socios</h1>
          <p className="subtitle">
            Sesión iniciada como <strong>{usuario.email}</strong>. Todas las operaciones quedan auditadas.
          </p>
        </div>
        <div className="dashboard__cta">
          <button 
            className="danger" 
            onClick={async () => {
              try {
                await api.post("auth/logout/");
                window.location.reload();
              } catch (err) {
                console.error("Error al cerrar sesión:", err);
                window.location.reload();
              }
            }}
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      <SociosViewer />
    </div>
  );
}

export default App;
