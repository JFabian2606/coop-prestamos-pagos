import { useEffect, useState } from "react";
import { api } from "../api";

type SolicitudItem = {
  id: string;
  estado?: string;
  monto?: string;
  plazo_meses?: number;
  descripcion?: string;
  socio?: {
    nombre_completo?: string;
    documento?: string;
    email?: string;
    estado?: string;
  } | null;
};

type Props = {
  onSelect: (id: string) => void;
};

export default function AnalistaSolicitudesList({ onSelect }: Props) {
  const [items, setItems] = useState<SolicitudItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState("");

  const fetchListado = async () => {
    setLoading(true);
    setError("");
    try {
      const params: Record<string, string> = { limit: "20" };
      if (q.trim()) params.q = q.trim();
      if (estado) params.estado = estado;
      const { data } = await api.get("solicitudes/", { params });
      setItems(data?.results ?? []);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "No se pudo cargar el listado.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchListado();
  }, []); // solo on-mount

  return (
    <div className="analista-card">
      <div className="analista-card__header">
        <div>
          <p className="eyebrow">Solicitudes recientes</p>
          <h2>Selecciona para evaluar</h2>
        </div>
        <div className="analista-actions">
          <input
            className="analista-input"
            placeholder="Buscar por id o descripcion"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select className="analista-input" value={estado} onChange={(e) => setEstado(e.target.value)}>
            <option value="">Todos</option>
            <option value="pendiente">Pendiente</option>
            <option value="aprobado">Aprobado</option>
            <option value="rechazado">Rechazado</option>
          </select>
          <button onClick={() => void fetchListado()} disabled={loading}>
            {loading ? "Cargando..." : "Filtrar"}
          </button>
        </div>
      </div>
      {error && <div className="alert error">{error}</div>}
      {items.length === 0 && !loading && <p className="muted">Sin solicitudes para mostrar.</p>}
      <div className="analista-list">
        {items.map((item) => (
          <button key={item.id} className="analista-list__row" onClick={() => onSelect(item.id)}>
            <div>
              <p className="eyebrow">{item.estado ?? "estado"}</p>
              <strong>{item.descripcion || "Sin descripcion"}</strong>
              <p className="subtitle">ID: {item.id}</p>
            </div>
            <div className="analista-list__meta">
              <span className="badge">{item.monto ?? "-"}</span>
              <span className="subtitle">{item.socio?.nombre_completo ?? "Sin socio"}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
