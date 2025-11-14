import { useEffect, useState } from "react";
import "./App.css";
import { supabase } from "./supabaseClient";
import { type Session } from "@supabase/supabase-js";
import LoginRegistro from "./components/LoginRegistro";
import SociosViewer from "./components/SociosViewer";

function App() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setSession(data.session ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (!session) {
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
            Sesión iniciada como <strong>{session.user.email}</strong>. Todas las operaciones quedan auditadas.
          </p>
        </div>
        <div className="dashboard__cta">
          <button className="danger" onClick={() => supabase.auth.signOut()}>
            Cerrar sesión
          </button>
        </div>
      </header>

      <SociosViewer />
    </div>
  );
}

export default App;
