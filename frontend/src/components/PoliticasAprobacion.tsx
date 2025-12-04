import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import "../styles/PoliticasAprobacion.css";

type PoliticaAprobacion = {
  id: string;
  nombre: string;
  descripcion: string;
  score_minimo: number;
  antiguedad_min_meses: number;
  ratio_cuota_ingreso_max: string | number;
  activo: boolean;
  created_at: string;
  updated_at: string;
};

type FormState = {
  id?: string;
  nombre: string;
  descripcion: string;
  score_minimo: string;
  antiguedad_min_meses: string;
  ratio_cuota_ingreso_max: string;
  activo: boolean;
};

const blankForm: FormState = {
  nombre: "",
  descripcion: "",
  score_minimo: "600",
  antiguedad_min_meses: "6",
  ratio_cuota_ingreso_max: "0.35",
  activo: true,
};

export default function PoliticasAprobacion() {
  const [politicas, setPoliticas] = useState<PoliticaAprobacion[]>([]);
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [editModalAbierta, setEditModalAbierta] = useState(false);
  const [form, setForm] = useState<FormState>(blankForm);

  const seleccionadoPolitica = useMemo(() => {
    if (!seleccionado) return null;
    return politicas.find((p) => p.id === seleccionado) ?? null;
  }, [politicas, seleccionado]);

  const fetchPoliticas = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (busqueda.trim()) params.q = busqueda.trim();
      const { data } = await api.get<PoliticaAprobacion[]>("politicas-aprobacion", { params });
      setPoliticas(data);
      setSeleccionado((prev) => {
        if (prev && data.some((p) => p.id === prev)) return prev;
        return data[0]?.id ?? null;
      });
      if (data.length > 0) {
        const actual = data.find((p) => p.id === (seleccionado ?? data[0].id)) ?? data[0];
        startEdit(actual, { silent: true });
      } else {
        resetForm();
      }
    } catch (err) {
      console.error(err);
      setError("No se pudo cargar las políticas de aprobación.");
      setPoliticas([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchPoliticas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busqueda]);

  const politicasFiltradas = useMemo(() => {
    const term = busqueda.trim().toLowerCase();
    if (!term) return politicas;
    return politicas.filter(
      (p) =>
        p.nombre.toLowerCase().includes(term) ||
        (p.descripcion ?? "").toLowerCase().includes(term)
    );
  }, [politicas, busqueda]);

  const resetForm = () => {
    setForm(blankForm);
    setSeleccionado(null);
    setOk(null);
    setError(null);
  };

  const startEdit = (politica: PoliticaAprobacion, opts?: { silent?: boolean }) => {
    setForm({
      id: politica.id,
      nombre: politica.nombre,
      descripcion: politica.descripcion ?? "",
      score_minimo: String(politica.score_minimo),
      antiguedad_min_meses: String(politica.antiguedad_min_meses),
      ratio_cuota_ingreso_max: String(politica.ratio_cuota_ingreso_max),
      activo: politica.activo,
    });
    setSeleccionado(politica.id);
    if (!opts?.silent) {
      setOk(null);
      setError(null);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setGuardando(true);
    setOk(null);
    setError(null);
    try {
      const ratio = Number(form.ratio_cuota_ingreso_max);
      const score = Number(form.score_minimo);
      const meses = Number(form.antiguedad_min_meses);
      if (!form.nombre.trim()) throw new Error("El nombre es obligatorio.");
      if (!Number.isFinite(ratio) || ratio < 0 || ratio > 1) throw new Error("El ratio debe estar entre 0 y 1 (ej: 0.35).");
      if (!Number.isFinite(score) || score < 0 || score > 1000) throw new Error("El score debe estar entre 0 y 1000.");
      if (!Number.isInteger(meses) || meses < 0) throw new Error("La antigüedad debe ser un entero positivo.");

      const payload = {
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim(),
        score_minimo: score,
        antiguedad_min_meses: meses,
        ratio_cuota_ingreso_max: ratio,
        activo: form.activo,
      };

      if (form.id) {
        const { data } = await api.put<PoliticaAprobacion>(`politicas-aprobacion/${form.id}/`, payload);
        setOk("Política actualizada.");
        setPoliticas((prev) => prev.map((p) => (p.id === data.id ? data : p)));
        startEdit(data, { silent: true });
      } else {
        const { data } = await api.post<PoliticaAprobacion>("politicas-aprobacion", payload);
        setOk("Política creada.");
        setPoliticas((prev) => [data, ...prev]);
        startEdit(data, { silent: true });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "No se pudo guardar la política.";
      setFormError(msg);
    } finally {
      setGuardando(false);
      setEditModalAbierta(false);
    }
  };

  const toggleActivo = async (politica: PoliticaAprobacion, activo?: boolean) => {
    setGuardando(true);
    setError(null);
    setOk(null);
    try {
      const desired = typeof activo === "boolean" ? activo : !politica.activo;
      const { data } = await api.patch<PoliticaAprobacion>(`politicas-aprobacion/${politica.id}/`, {
        activo: desired,
      });
      setPoliticas((prev) => prev.map((p) => (p.id === data.id ? data : p)));
      startEdit(data, { silent: true });
      setOk(data.activo ? "Política activada." : "Política desactivada.");
    } catch (err) {
      console.error(err);
      setError("No se pudo actualizar el estado.");
    } finally {
      setGuardando(false);
    }
  };

  const abrirEdicion = () => {
    if (!seleccionadoPolitica) return;
    startEdit(seleccionadoPolitica);
    setFormError(null);
    setEditModalAbierta(true);
  };

  const formatPercent = (value: string | number) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return value;
    return `${(num * 100).toFixed(1)}%`;
  };

  return (
    <section className="socios-panel politicas-panel">
      <header className="socios-panel__header">
        <div>
          <p className="eyebrow">Configuracion</p>
          <h2>Políticas de aprobación</h2>
          <p className="subtitle">Define reglas automáticas basadas en score, antigüedad y capacidad de pago.</p>
        </div>
        <div className="socios-panel__actions">
          <label className="search-input">
            <span>Buscar</span>
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Nombre o descripción"
            />
          </label>
          <div className="actions-row">
            <button className="ghost" onClick={() => void fetchPoliticas()} disabled={loading}>
              {loading ? "Actualizando..." : "Actualizar"}
            </button>
            <button className="primary" onClick={resetForm}>
              <i className="bx bx-plus-circle" aria-hidden="true" /> Nueva política
            </button>
          </div>
        </div>
      </header>

      {error && <div className="alert error">{error}</div>}
      {ok && <div className="alert success">{ok}</div>}

      <div className="socios-layout tipos-layout">
        <div className="socios-table tipos-table">
          <div className="socios-table__head">
            <span>Nombre</span>
            <span>Score mínimo</span>
            <span>Antigüedad</span>
            <span>Capacidad</span>
            <span>Estado</span>
          </div>
          <div className="socios-table__body">
            {loading && <p className="muted">Cargando políticas...</p>}
            {!loading && politicasFiltradas.length === 0 && <p className="muted">No hay políticas para el filtro seleccionado.</p>}
            {politicasFiltradas.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`socios-row ${seleccionado === p.id ? "active" : ""}`}
                onClick={() => startEdit(p)}
              >
                <span className="tipo-cell">
                  <strong>{p.nombre}</strong>
                  <small>{p.descripcion || "Sin descripción"}</small>
                </span>
                <span>{p.score_minimo}</span>
                <span>{p.antiguedad_min_meses} meses</span>
                <span>{formatPercent(p.ratio_cuota_ingreso_max)}</span>
                <span className={p.activo ? "estado-pill estado-pill--activo" : "estado-pill estado-pill--inactivo"}>
                  {p.activo ? "Activa" : "Inactiva"}
                </span>
              </button>
            ))}
          </div>
        </div>

        <aside className="socios-detail tipos-detail">
          {!seleccionadoPolitica && <p className="muted">Selecciona una política para ver su detalle.</p>}
          {seleccionadoPolitica && (
            <>
              <div className="tipos-detail__header">
                <h3>{seleccionadoPolitica.nombre}</h3>
                <div className="estado-control">
                  <button
                    type="button"
                    className={`estado-pill estado-pill--${seleccionadoPolitica.activo ? "activo" : "inactivo"} estado-pill--action`}
                    onClick={(e) => {
                      e.stopPropagation();
                      void toggleActivo(seleccionadoPolitica);
                    }}
                    disabled={guardando}
                  >
                    {seleccionadoPolitica.activo ? "Activa" : "Inactiva"}
                    <span className="estado-pill__caret">▼</span>
                  </button>
                </div>
              </div>
              <p className="subtitle">Reglas usadas para aprobar automáticamente nuevas solicitudes.</p>
              <div className="socios-detail__actions">
                <button type="button" className="ghost icon-button" onClick={abrirEdicion}>
                  <i className="bx bxs-pencil icon-brand-hover" aria-hidden />
                  <span>Editar política</span>
                </button>
              </div>
              <dl className="tipos-dl">
                <dt>Descripción</dt>
                <dd>{seleccionadoPolitica.descripcion || "Sin descripción"}</dd>
                <dt>Score mínimo</dt>
                <dd>{seleccionadoPolitica.score_minimo}</dd>
                <dt>Antigüedad mínima</dt>
                <dd>{seleccionadoPolitica.antiguedad_min_meses} meses</dd>
                <dt>Capacidad de pago</dt>
                <dd>Cuota máx: {formatPercent(seleccionadoPolitica.ratio_cuota_ingreso_max)} del ingreso mensual</dd>
                <dt>Actualizado</dt>
                <dd>{new Date(seleccionadoPolitica.updated_at).toLocaleString()}</dd>
              </dl>
            </>
          )}
        </aside>
      </div>

      {editModalAbierta && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal modal--tipos">
            <div className="modal__header">
              <h4>{form.id ? "Editar política" : "Nueva política"}</h4>
              <button
                type="button"
                className="ghost close-button"
                onClick={() => setEditModalAbierta(false)}
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>
            <form className="modal__body" onSubmit={handleSubmit}>
              {formError && <div className="alert error">{formError}</div>}
              <label>
                <span>Nombre</span>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={(e) => setForm((prev) => ({ ...prev, nombre: e.target.value }))}
                  required
                />
              </label>
              <label>
                <span>Descripción</span>
                <textarea
                  value={form.descripcion}
                  onChange={(e) => setForm((prev) => ({ ...prev, descripcion: e.target.value }))}
                  rows={3}
                />
              </label>
              <label>
                <span>Score mínimo</span>
                <input
                  type="number"
                  min="0"
                  max="1000"
                  value={form.score_minimo}
                  onChange={(e) => setForm((prev) => ({ ...prev, score_minimo: e.target.value }))}
                  required
                />
              </label>
              <label>
                <span>Antigüedad mínima (meses)</span>
                <input
                  type="number"
                  min="0"
                  value={form.antiguedad_min_meses}
                  onChange={(e) => setForm((prev) => ({ ...prev, antiguedad_min_meses: e.target.value }))}
                  required
                />
              </label>
              <label>
                <span>Ratio cuota/ingreso máximo (0 - 1)</span>
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.01"
                  value={form.ratio_cuota_ingreso_max}
                  onChange={(e) => setForm((prev) => ({ ...prev, ratio_cuota_ingreso_max: e.target.value }))}
                  required
                />
              </label>
              <label className="checkbox inline">
                <input
                  type="checkbox"
                  checked={form.activo}
                  onChange={(e) => setForm((prev) => ({ ...prev, activo: e.target.checked }))}
                />
                Política activa
              </label>
              <div className="modal__footer">
                <button type="button" className="ghost close-button" onClick={() => setEditModalAbierta(false)}>
                  Cancelar
                </button>
                <button type="submit" className="primary" disabled={guardando}>
                  {guardando ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
