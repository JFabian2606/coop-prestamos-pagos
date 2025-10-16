import { useEffect, useState } from 'react';
import './App.css';
import { supabase } from './supabaseClient';
import { api } from './api';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { type Session } from '@supabase/supabase-js';

function App() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setSession(data.session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (!session) {
    return (
      <div style={{ maxWidth: 420, margin: '2rem auto' }}>
        <h1>COOPRESTAMOS</h1>
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          providers={['google']}
          socialLayout="vertical"
        />
        <p style={{ marginTop: 12, fontSize: 12, color: '#666' }}>
          También puedes usar email/contraseña desde el formulario.
        </p>
      </div>
    );
  }

  const [apiResult, setApiResult] = useState<string | null>(null);

  return (
    <div style={{ maxWidth: 600, margin: '2rem auto' }}>
      <h1>Bienvenido</h1>
      <p>
        Sesión iniciada como <strong>{session.user.email}</strong>
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => supabase.auth.signOut()}>Cerrar sesión</button>
        <button
          onClick={async () => {
            try {
              const { data } = await api.get('api/ping/');
              setApiResult(JSON.stringify(data));
            } catch (e: any) {
              setApiResult(e?.message ?? 'Error al llamar API');
            }
          }}
        >
          Probar API
        </button>
      </div>
      {apiResult && (
        <pre style={{ marginTop: 16, background: '#f8f8f8', padding: 12 }}>
{apiResult}
        </pre>
      )}
      <div style={{ marginTop: 16, fontSize: 12, color: '#666' }}>
        <p>
          Token (corto): {session.access_token.slice(0, 12)}…
        </p>
      </div>
    </div>
  );
}

export default App;
