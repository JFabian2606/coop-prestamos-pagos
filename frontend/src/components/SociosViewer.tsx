import { AxiosError, isAxiosError } from "axios";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api";
import "../styles/SociosViewer.css";

export type SocioDto = {
  id: string;
  nombre_completo: string;
  documento: string | null;
  telefono: string | null;
  direccion: string | null;
  datos_fiscales: Record<string, any>;
  estado: "activo" | "inactivo" | "suspendido";
  email: string;
  created_at: string;
  updated_at: string;
};

const estadoLabels: Record<SocioDto["estado"], string> = {
  activo: "Activo",
  inactivo: "Inactivo",
  suspendido: "Suspendido",
};

export default function SociosViewer() {
  const [socios, setSocios] = useState<SocioDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<"todos" | SocioDto["estado"]>("todos");
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchSocios = useCallback(async () => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<SocioDto[]>("socios", { signal: controller.signal });
      setSocios(data);
      setSeleccionado((prev) => {
        if (prev && data.some((s) => s.id === prev)) {
          return prev;
        }
        return data[0]?.id ?? null;
      });
    } catch (err) {
      if (controller.signal.aborted) {
        return;
      }
      if (isAxiosError(err) && err.code === AxiosError.ERR_CANCELED) {
        return;
      }

      let detail = "No se pudo cargar la lista de socios";
      if (isAxiosError(err)) {
        const status = err.response?.status;
        if (status === 401) {
          detail = "Tu sesion expiro. Ingresa nuevamente.";
          setSocios([]);
          setSeleccionado(null);
        } else if (status === 403) {
          detail = "Tu usuario no tiene permisos para administrar socios.";
          setSocios([]);
          setSeleccionado(null);
        } else {
          detail = (err.response?.data as any)?.detail ?? detail;
        }
      }
      setError(detail);
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void fetchSocios();
    return () => {
      abortRef.current?.abort();
    };
  }, [fetchSocios]);

  const sociosFiltrados = useMemo(() => {
    if (filtro === "todos") return socios;
    return socios.filter((s) => s.estado === filtro);
  }, [filtro, socios]);

  const socioActivo = useMemo(() => {
    if (seleccionado) {
      return socios.find((s) => s.id === seleccionado) ?? null;
    }
    return null;
  }, [seleccionado, socios]);

  return (
    <section className="socios-panel">
      <header className="socios-panel__header">
        <div>
          <p className="eyebrow">Panel de administración</p>
          <h2>Socios registrados</h2>
          <p className="subtitle">
            Visualiza el estado actual, datos de contacto y datos fiscales sincronizados desde Supabase.
          </p>
        </div>
        <div className="socios-panel__actions">
          <label className="select">
            <span>Filtrar por estado</span>
            <select value={filtro} onChange={(e) => setFiltro(e.target.value as any)}>
              <option value="todos">Todos</option>
              <option value="activo">Activos</option>
              <option value="inactivo">Inactivos</option>
              <option value="suspendido">Suspendidos</option>
            </select>
          </label>
          <button className="ghost" onClick={() => void fetchSocios()} disabled={loading}>
            {loading ? "Actualizando..." : "Actualizar"}
          </button>
        </div>
      </header>

      {error && <div className="alert error">{error}</div>}

      <div className="socios-layout">
        <div className="socios-table">
          <div className="socios-table__head">
            <span>Nombre</span>
            <span>Documento</span>
            <span>Telefono</span>
            <span>Estado</span>
          </div>
          <div className="socios-table__body">
            {loading && <p className="muted">Cargando socios...</p>}
            {!loading && sociosFiltrados.length === 0 && <p className="muted">No hay socios para el filtro seleccionado.</p>}
            {sociosFiltrados.map((socio) => (
              <button
                type="button"
                className={`socios-row ${seleccionado === socio.id ? "active" : ""}`}
                key={socio.id}
                onClick={() => setSeleccionado(socio.id)}
              >
                <span>
                  <strong>{socio.nombre_completo}</strong>
                  <small>{socio.email}</small>
                </span>
                <span>{socio.documento ?? "-"}</span>
                <span>{socio.telefono ?? "-"}</span>
                <span className={`estado-pill estado-pill--${socio.estado}`}>{estadoLabels[socio.estado]}</span>
              </button>
            ))}
          </div>
        </div>

        <aside className="socios-detail">
          {!socioActivo && <p className="muted">Selecciona un socio para ver su detalle.</p>}
          {socioActivo && (
            <>
              <h3>{socioActivo.nombre_completo}</h3>
              <dl>
                <dt>Documento</dt>
                <dd>{socioActivo.documento || "No registrado"}</dd>
                <dt>Telefono</dt>
                <dd>{socioActivo.telefono || "No registrado"}</dd>
                <dt>Direccion</dt>
                <dd>{socioActivo.direccion || "No registrada"}</dd>
                <dt>Estado</dt>
                <dd>
                  <span className={`estado-pill estado-pill--${socioActivo.estado}`}>
                    {estadoLabels[socioActivo.estado]}
                  </span>
                </dd>
                <dt>Datos fiscales</dt>
                <dd>
                  <code>{JSON.stringify(socioActivo.datos_fiscales ?? {}, null, 2)}</code>
                </dd>
                <dt>Ultima actualizacion</dt>
                <dd>{new Date(socioActivo.updated_at).toLocaleString()}</dd>
              </dl>
            </>
          )}
        </aside>
      </div>
    </section>
  );
}
