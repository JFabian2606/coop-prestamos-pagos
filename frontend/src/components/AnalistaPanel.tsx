import { useState } from "react";
import { api } from "../api";
import logo from "../assets/solo-logo-cooprestamos-vector.svg";

type SolicitudDetalle = {
  solicitud: {
    id: string;
    estado?: string;
    monto?: string;
    plazo_meses?: number;
    descripcion?: string;
    observaciones?: string;
  };
  socio?: {
    id: string;
    nombre_completo: string;
    documento: string | null;
    email?: string | null;
    estado?: string;
  } | null;
  analisis?: {
    recomendacion?: string;
    puede_aprobar?: boolean;
  };
};

type Props = {
  usuario: any;
  onLogout: () => void;
};

const DetalleSolicitud = ({ detalle }: { detalle: SolicitudDetalle | null }) => {
  if (!detalle) return null;
  const { solicitud, socio, analisis } = detalle;
  return (
    <div className="analista-detail">
      <div className="analista-detail__row">
        <div>
          <p className="eyebrow">Solicitud</p>
          <h3>{solicitud.id}</h3>
          <p className="subtitle">Estado: {solicitud.estado ?? "desconocido"}</p>
          <p className="subtitle">
            Monto: <strong>{solicitud.monto ?? "-"}</strong> · Plazo: {solicitud.plazo_meses ?? "-"} meses
          </p>
          {analisis?.recomendacion && (
            <p className="badge badge-info">Recomendación: {analisis.recomendacion}</p>
          )}
        </div>
      </div>
      {socio && (
        <div className="analista-detail__row analista-detail__grid">
          <div>
            <p className="eyebrow">Socio</p>
            <strong>{socio.nombre_completo}</strong>
            <p className="subtitle">{socio.email ?? "Sin email"}</p>
          </div>
          <div>
            <p className="eyebrow">Documento</p>
            <strong>{socio.documento ?? "-"}</strong>
          </div>
          <div>
            <p className="eyebrow">Estado</p>
            <span className="badge">{socio.estado ?? "N/D"}</span>
          </div>
        </div>
      )}
      {solicitud.observaciones && (
        <div className="analista-detail__row">
          <p className="eyebrow">Observaciones</p>
          <p className="subtitle">{solicitud.observaciones}</p>
        </div>
      )}
    </div>
  );
};

const AnalistaEvaluarModule = () => {
  const [solicitudId, setSolicitudId] = useState("");
  const [detalle, setDetalle] = useState<SolicitudDetalle | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [observaciones, setObservaciones] = useState("");

  const buscar = async () => {
    setLoading(true);
    setError("");
    setOk("");
    try {
      const { data } = await api.get(`solicitudes/${solicitudId}/evaluar/`);
      setDetalle(data);
      setObservaciones(data?.solicitud?.observaciones ?? "");
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "No se pudo cargar la solicitud.");
      setDetalle(null);
    } finally {
      setLoading(false);
    }
  };

  const guardarObs = async () => {
    if (!solicitudId) return;
    setLoading(true);
    setError("");
    setOk("");
    try {
      await api.put(`solicitudes/${solicitudId}/evaluar/`, {
        observaciones,
        recomendacion: detalle?.analisis?.recomendacion,
      });
      setOk("Observaciones guardadas.");
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "No se pudo guardar la observación.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="analista-card">
      <div className="analista-card__header">
        <div>
          <p className="eyebrow">Evaluar solicitud</p>
          <h2>Revisar datos y agregar observaciones</h2>
        </div>
        <div className="analista-actions">
          <input
            className="analista-input"
            placeholder="ID de solicitud"
            value={solicitudId}
            onChange={(e) => setSolicitudId(e.target.value)}
          />
          <button onClick={() => void buscar()} disabled={loading || !solicitudId}>
            {loading ? "Cargando..." : "Buscar"}
          </button>
        </div>
      </div>
      {error && <div className="alert error">{error}</div>}
      {ok && <div className="alert success">{ok}</div>}
      <DetalleSolicitud detalle={detalle} />
      {detalle && (
        <div className="analista-form">
          <label>
            <span>Observaciones</span>
            <textarea
              rows={3}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Notas para la decisión"
            />
          </label>
          <div className="analista-actions">
            <button className="primary" onClick={() => void guardarObs()} disabled={loading}>
              {loading ? "Guardando..." : "Guardar observaciones"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const AnalistaDecisionModule = () => {
  const [solicitudId, setSolicitudId] = useState("");
  const [detalle, setDetalle] = useState<SolicitudDetalle | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [comentario, setComentario] = useState("");

  const buscar = async () => {
    setLoading(true);
    setError("");
    setOk("");
    try {
      const { data } = await api.get(`solicitudes/${solicitudId}/evaluar/`);
      setDetalle(data);
      setComentario(data?.solicitud?.observaciones ?? "");
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "No se pudo cargar la solicitud.");
      setDetalle(null);
    } finally {
      setLoading(false);
    }
  };

  const decidir = async (estado: "aprobar" | "rechazar") => {
    if (!solicitudId) return;
    setLoading(true);
    setError("");
    setOk("");
    try {
      const url = estado === "aprobar" ? `solicitudes/${solicitudId}/aprobar/` : `solicitudes/${solicitudId}/rechazar/`;
      const { data } = await api.patch(url, { comentario });
      setOk(`Solicitud ${data.estado}.`);
      setDetalle((prev) =>
        prev
          ? { ...prev, solicitud: { ...prev.solicitud, estado: data.estado, observaciones: comentario } }
          : prev
      );
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "No se pudo actualizar la solicitud.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="analista-card">
      <div className="analista-card__header">
        <div>
          <p className="eyebrow">Aprobar / Rechazar</p>
          <h2>Decidir con comentario</h2>
        </div>
        <div className="analista-actions">
          <input
            className="analista-input"
            placeholder="ID de solicitud"
            value={solicitudId}
            onChange={(e) => setSolicitudId(e.target.value)}
          />
          <button onClick={() => void buscar()} disabled={loading || !solicitudId}>
            {loading ? "Cargando..." : "Buscar"}
          </button>
        </div>
      </div>
      {error && <div className="alert error">{error}</div>}
      {ok && <div className="alert success">{ok}</div>}
      <DetalleSolicitud detalle={detalle} />
      {detalle && (
        <div className="analista-form">
          <label>
            <span>Comentario de decisión</span>
            <textarea
              rows={3}
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              placeholder="Motivo o comentario para el socio"
            />
          </label>
          <div className="analista-actions">
            <button className="primary" onClick={() => void decidir("aprobar")} disabled={loading}>
              {loading ? "Procesando..." : "Aprobar"}
            </button>
            <button className="danger" onClick={() => void decidir("rechazar")} disabled={loading}>
              {loading ? "Procesando..." : "Rechazar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default function AnalistaPanel({ usuario, onLogout }: Props) {
  const [vista, setVista] = useState<"evaluar" | "decidir">("evaluar");
  const nombreParaMostrar = usuario?.nombre ?? usuario?.email ?? "Analista";

  return (
    <div className="admin-shell analista-shell">
      <header className="topbar">
        <div className="brand">
          <img src={logo} alt="Cooprestamos logo" />
          <div>
            <p className="brand__eyebrow">Panel Analista</p>
            <p className="brand__name">Cooprestamos</p>
          </div>
        </div>
        <div className="topbar__right">
          <div className="user-chip" aria-label={`Sesion iniciada como ${nombreParaMostrar}`}>
            <div className="user-chip__avatar">
              <img src={logo} alt="Avatar analista" />
            </div>
            <div>
              <p className="user-chip__label">Analista</p>
              <p className="user-chip__name">{nombreParaMostrar}</p>
            </div>
          </div>
          <button className="ghost" onClick={() => setVista("evaluar")}>
            Evaluar
          </button>
          <button className="ghost" onClick={() => setVista("decidir")}>
            Aprobar/Rechazar
          </button>
          <button className="danger" onClick={onLogout}>
            Cerrar sesion
          </button>
        </div>
      </header>

      <main className="admin-container">
        <div className="page-header">
          <div>
            <p className="eyebrow">Analisis</p>
            <h1>{vista === "evaluar" ? "Evaluar solicitudes" : "Aprobar o rechazar"}</h1>
            <p className="subtitle">
              Solo visible para rol Analista. Busca una solicitud por ID, agrega observaciones y decide.
            </p>
          </div>
        </div>

        <div className="analista-modules">
          {vista === "evaluar" ? <AnalistaEvaluarModule /> : <AnalistaDecisionModule />}
        </div>
      </main>

      <footer className="admin-footer">Cooprestamos - Panel Analista - {new Date().getFullYear()}</footer>
    </div>
  );
}
