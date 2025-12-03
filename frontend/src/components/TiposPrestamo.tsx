import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { api } from "../api";
import "../styles/TiposPrestamo.css";

type TipoPrestamoDto = {
  id: string;
  nombre: string;
  descripcion: string;
  tasa_interes_anual: string;
  plazo_meses: number;
  requisitos: string[];
  activo: boolean;
  created_at: string;
  updated_at: string;
};

type FormState = {
  id?: string;
  nombre: string;
  descripcion: string;
  tasa_interes_anual: string;
  plazo_meses: string;
  requisitosTexto: string;
  activo: boolean;
};

type EstadoFiltro = "todos" | "activos" | "inactivos";

const blankForm: FormState = {
  nombre: "",
  descripcion: "",
  tasa_interes_anual: "",
  plazo_meses: "12",
  requisitosTexto: "",
  activo: true,
};

const badgeActivo = (activo: boolean) => (activo ? "estado-pill estado-pill--activo" : "estado-pill estado-pill--inactivo");

const parseRequisitos = (texto: string) =>
  texto
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

export default function TiposPrestamo() {
  const [tipos, setTipos] = useState<TipoPrestamoDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoFiltro>("activos");
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [editModalAbierta, setEditModalAbierta] = useState(false);
  const [estadoMenuOpen, setEstadoMenuOpen] = useState(false);
  const [form, setForm] = useState<FormState>(blankForm);

  const seleccionadoTipo = useMemo(() => {
    if (!seleccionado) return null;
    return tipos.find((t) => t.id === seleccionado) ?? null;
  }, [seleccionado, tipos]);

  const fetchTipos = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (estadoFiltro === "activos") params.soloActivos = "true";
      if (busqueda.trim()) params.q = busqueda.trim();
      const { data } = await api.get<TipoPrestamoDto[]>("tipos-prestamo", { params });
      setTipos(data);
      setSeleccionado((prev) => {
        if (prev && data.some((t) => t.id === prev)) return prev;
        return data[0]?.id ?? null;
      });
      if (data.length > 0) {
        const actual = data.find((t) => t.id === (seleccionado ?? data[0].id)) ?? data[0];
        startEdit(actual, { silent: true });
      } else {
        resetForm();
      }
    } catch (err) {
      console.error(err);
      setError("No se pudo cargar los tipos de prestamo.");
      setTipos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchTipos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estadoFiltro, busqueda]);

  useEffect(() => {
    const closeMenus = () => setEstadoMenuOpen(false);
    document.addEventListener("click", closeMenus);
    return () => document.removeEventListener("click", closeMenus);
  }, []);

  const tiposFiltrados = useMemo(() => {
    const term = busqueda.trim().toLowerCase();
    let resultado = tipos;
    if (estadoFiltro === "activos") resultado = resultado.filter((t) => t.activo);
    if (estadoFiltro === "inactivos") resultado = resultado.filter((t) => !t.activo);
    if (term) {
      resultado = resultado.filter((tipo) => {
        return (
          tipo.nombre.toLowerCase().includes(term) ||
          (tipo.descripcion ?? "").toLowerCase().includes(term) ||
          tipo.requisitos.some((req) => req.toLowerCase().includes(term))
        );
      });
    }
    return resultado;
  }, [tipos, busqueda, estadoFiltro]);

  const resetForm = () => {
    setForm(blankForm);
    setSeleccionado(null);
    setOk(null);
    setError(null);
  };

  const startEdit = (tipo: TipoPrestamoDto, opts?: { silent?: boolean }) => {
    setForm({
      id: tipo.id,
      nombre: tipo.nombre,
      descripcion: tipo.descripcion ?? "",
      tasa_interes_anual: String(tipo.tasa_interes_anual),
      plazo_meses: String(tipo.plazo_meses),
      requisitosTexto: tipo.requisitos.join("\n"),
      activo: tipo.activo,
    });
    setSeleccionado(tipo.id);
    if (!opts?.silent) {
      setOk(null);
      setError(null);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setGuardando(true);
    setOk(null);
    setError(null);
    try {
      const tasa = Number(form.tasa_interes_anual);
      const plazo = Number(form.plazo_meses);
      if (!form.nombre.trim()) throw new Error("El nombre es obligatorio.");
      if (Number.isNaN(tasa) || tasa < 0) throw new Error("La tasa anual debe ser un numero valido.");
      if (!Number.isInteger(plazo) || plazo < 1) throw new Error("El plazo debe ser un entero mayor a 0.");

      const payload = {
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim(),
        tasa_interes_anual: form.tasa_interes_anual,
        plazo_meses: plazo,
        requisitos: parseRequisitos(form.requisitosTexto),
        activo: form.activo,
      };

      if (form.id) {
        const { data } = await api.put<TipoPrestamoDto>(`tipos-prestamo/${form.id}/`, payload);
        setOk("Tipo de prestamo actualizado.");
        setTipos((prev) => prev.map((t) => (t.id === data.id ? data : t)));
        startEdit(data, { silent: true });
      } else {
        const { data } = await api.post<TipoPrestamoDto>("tipos-prestamo", payload);
        setOk("Tipo de prestamo creado.");
        setTipos((prev) => [data, ...prev]);
        startEdit(data, { silent: true });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "No se pudo guardar el tipo de prestamo.";
      setFormError(msg);
    } finally {
      setGuardando(false);
      setEditModalAbierta(false);
    }
  };

  const toggleActivo = async (tipo: TipoPrestamoDto, activo?: boolean) => {
    setGuardando(true);
    setError(null);
    setOk(null);
    try {
      let data: TipoPrestamoDto;
      const desired = typeof activo === "boolean" ? activo : !tipo.activo;
      if (desired) {
        const resp = await api.patch<TipoPrestamoDto>(`tipos-prestamo/${tipo.id}/`, { activo: true });
        data = resp.data;
      } else {
        const resp = await api.delete<TipoPrestamoDto>(`tipos-prestamo/${tipo.id}/`);
        data = resp.data;
      }
      setTipos((prev) => prev.map((t) => (t.id === data.id ? data : t)));
      startEdit(data, { silent: true });
      setOk(data.activo ? "Tipo activado." : "Tipo desactivado.");
    } catch (err) {
      console.error(err);
      setError("No se pudo actualizar el estado.");
    } finally {
      setGuardando(false);
    }
  };

  const abrirEdicion = () => {
    if (!seleccionadoTipo) return;
    startEdit(seleccionadoTipo);
    setFormError(null);
    setEditModalAbierta(true);
  };

  return (
    <section className="socios-panel tipos-panel">
      <header className="socios-panel__header">
        <div>
          <h2>Tipos de prestamo</h2>
          <p className="subtitle">
            Gestiona productos como personal, hipotecario o vehicular con sus tasas, plazos y requisitos.
          </p>
        </div>
        <div className="socios-panel__actions">
          <label className="search-input">
            <span>Buscar</span>
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Nombre, requisito o descripcion"
            />
          </label>
          <label className="select">
            <span>Filtrar por estado</span>
            <select value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value as EstadoFiltro)}>
              <option value="todos">Todos</option>
              <option value="activos">Activos</option>
              <option value="inactivos">Inactivos</option>
            </select>
          </label>
          <div className="actions-row">
            <button className="ghost" onClick={() => void fetchTipos()} disabled={loading}>
              {loading ? "Actualizando..." : "Actualizar"}
            </button>
            <button className="primary" onClick={resetForm}>
              <i className="bx bx-plus-circle" aria-hidden="true" /> Nuevo tipo
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
            <span>Tasa anual</span>
            <span>Plazo</span>
            <span>Requisitos</span>
            <span>Estado</span>
          </div>
          <div className="socios-table__body">
            {loading && <p className="muted">Cargando tipos de prestamo...</p>}
            {!loading && tiposFiltrados.length === 0 && <p className="muted">No hay tipos para el filtro seleccionado.</p>}
            {tiposFiltrados.map((tipo) => (
              <button
                key={tipo.id}
                type="button"
                className={`socios-row ${seleccionado === tipo.id ? "active" : ""}`}
                onClick={() => startEdit(tipo)}
              >
                <span className="tipo-cell">
                  <strong>{tipo.nombre}</strong>
                  <small>{tipo.descripcion || "Sin descripcion"}</small>
                </span>
                <span>{Number(tipo.tasa_interes_anual).toFixed(2)}%</span>
                <span>{tipo.plazo_meses} meses</span>
                <span className="requisitos-chip">
                  {tipo.requisitos.length === 0 && "-"}
                  {tipo.requisitos.length > 0 && tipo.requisitos.slice(0, 2).join(", ")}
                  {tipo.requisitos.length > 2 && ` +${tipo.requisitos.length - 2}`}
                </span>
                <span className={badgeActivo(tipo.activo)}>{tipo.activo ? "Activo" : "Inactivo"}</span>
              </button>
            ))}
          </div>
        </div>

        <aside className="socios-detail tipos-detail">
          {!seleccionadoTipo && <p className="muted">Selecciona un tipo de prestamo.</p>}
          {seleccionadoTipo && (
            <>
              <div className="tipos-detail__header">
                <h3>{seleccionadoTipo.nombre}</h3>
                <div className="estado-control">
                  <button
                    type="button"
                    className={`estado-pill estado-pill--${seleccionadoTipo.activo ? "activo" : "inactivo"} estado-pill--action`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setEstadoMenuOpen((prev) => !prev);
                    }}
                    disabled={guardando}
                  >
                    {seleccionadoTipo.activo ? "Activo" : "Inactivo"}
                    <span className="estado-pill__caret">▼</span>
                  </button>
                  {estadoMenuOpen && (
                    <div className="estado-menu" onClick={(e) => e.stopPropagation()}>
                      <p className="estado-menu__label">Cambiar a</p>
                      <button
                        type="button"
                        className="estado-option"
                        onClick={() => void toggleActivo(seleccionadoTipo, true)}
                        disabled={guardando || seleccionadoTipo.activo}
                      >
                        <span className="estado-dot estado-dot--activo" />
                        Activo
                      </button>
                      <button
                        type="button"
                        className="estado-option"
                        onClick={() => void toggleActivo(seleccionadoTipo, false)}
                        disabled={guardando || !seleccionadoTipo.activo}
                      >
                        <span className="estado-dot estado-dot--inactivo" />
                        Inactivo
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <p className="subtitle">Completa los parametros que se usaran al originar nuevos creditos.</p>
              <div className="socios-detail__actions">
                <button type="button" className="ghost icon-button" onClick={abrirEdicion}>
                  <i className="bx bxs-pencil icon-brand-hover" aria-hidden />
                  <span>Editar datos</span>
                </button>
              </div>
              <dl className="tipos-dl">
                <dt>Descripcion</dt>
                <dd>{seleccionadoTipo.descripcion || "Sin descripcion"}</dd>
                <dt>Tasa interes anual (%)</dt>
                <dd>{Number(seleccionadoTipo.tasa_interes_anual).toFixed(2)}%</dd>
                <dt>Plazo (meses)</dt>
                <dd>{seleccionadoTipo.plazo_meses}</dd>
                <dt>Requisitos</dt>
                <dd>
                  {seleccionadoTipo.requisitos.length === 0
                    ? "Sin requisitos"
                    : seleccionadoTipo.requisitos.join(", ")}
                </dd>
                <dt>Actualizado</dt>
                <dd>{new Date(seleccionadoTipo.updated_at).toLocaleString()}</dd>
              </dl>
            </>
          )}
        </aside>
      </div>

      {editModalAbierta && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal modal--tipos">
            <div className="modal__header">
              <h4>{form.id ? "Editar tipo de prestamo" : "Nuevo tipo de prestamo"}</h4>
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
                <span>Descripcion</span>
                <textarea
                  value={form.descripcion}
                  onChange={(e) => setForm((prev) => ({ ...prev, descripcion: e.target.value }))}
                  rows={3}
                />
              </label>
              <label>
                <span>Tasa interes anual (%)</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.tasa_interes_anual}
                  onChange={(e) => setForm((prev) => ({ ...prev, tasa_interes_anual: e.target.value }))}
                  required
                />
              </label>
              <label>
                <span>Plazo (meses)</span>
                <input
                  type="number"
                  min="1"
                  value={form.plazo_meses}
                  onChange={(e) => setForm((prev) => ({ ...prev, plazo_meses: e.target.value }))}
                  required
                />
              </label>
              <label>
                <span>Requisitos (uno por linea o coma)</span>
                <textarea
                  value={form.requisitosTexto}
                  onChange={(e) => setForm((prev) => ({ ...prev, requisitosTexto: e.target.value }))}
                  placeholder={"Documento de identidad\nComprobante de ingresos\nAval de empresa"}
                  rows={4}
                />
              </label>
              <label className="checkbox inline">
                <input
                  type="checkbox"
                  checked={form.activo}
                  onChange={(e) => setForm((prev) => ({ ...prev, activo: e.target.checked }))}
                />
                Tipo activo
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

