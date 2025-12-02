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
      setError(msg);
    } finally {
      setGuardando(false);
    }
  };

  const toggleActivo = async (tipo: TipoPrestamoDto) => {
    setGuardando(true);
    setError(null);
    setOk(null);
    try {
      let data: TipoPrestamoDto;
      if (tipo.activo) {
        const resp = await api.delete<TipoPrestamoDto>(`tipos-prestamo/${tipo.id}/`);
        data = resp.data;
      } else {
        const resp = await api.patch<TipoPrestamoDto>(`tipos-prestamo/${tipo.id}/`, { activo: true });
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
                  {tipo.requisitos.length === 0 && "—"}
                  {tipo.requisitos.length > 0 && tipo.requisitos.slice(0, 2).join(", ")}
                  {tipo.requisitos.length > 2 && ` +${tipo.requisitos.length - 2}`}
                </span>
                <span className={badgeActivo(tipo.activo)}>{tipo.activo ? "Activo" : "Inactivo"}</span>
              </button>
            ))}
          </div>
        </div>

        <aside className="socios-detail tipos-detail">
          <form className="tipos-form" onSubmit={handleSubmit}>
            <div className="tipos-detail__header">
              <div>
                <h3>{form.nombre || "Nuevo tipo de prestamo"}</h3>
                <p className="subtitle">Completa los parametros que se usaran al originar nuevos creditos.</p>
              </div>
              <span className={badgeActivo(form.activo)}>{form.activo ? "Activo" : "Inactivo"}</span>
            </div>

            <div className="socios-detail__actions">
              <button type="submit" className="ghost icon-button" disabled={guardando}>
                <i className="bx bxs-save icon-brand-hover" aria-hidden="true" />
                {guardando ? "Guardando..." : "Guardar cambios"}
              </button>
              {seleccionadoTipo && (
                <button
                  type="button"
                  className={`ghost ${seleccionadoTipo.activo ? "danger-ghost" : ""}`}
                  onClick={() => void toggleActivo(seleccionadoTipo)}
                  disabled={guardando}
                >
                  <i className="bx bx-power-off icon-brand-hover" aria-hidden="true" />
                  {seleccionadoTipo.activo ? "Desactivar" : "Activar"}
                </button>
              )}
            </div>

            <dl className="tipos-dl">
              <dt>Nombre</dt>
              <dd>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={(e) => setForm((prev) => ({ ...prev, nombre: e.target.value }))}
                  placeholder="Personal, Hipotecario, Vehicular..."
                  required
                />
              </dd>

              <dt>Descripcion</dt>
              <dd>
                <textarea
                  value={form.descripcion}
                  onChange={(e) => setForm((prev) => ({ ...prev, descripcion: e.target.value }))}
                  placeholder="Ej: Libre inversion con descuento por nomina."
                  rows={3}
                />
              </dd>

              <dt>Tasa interes anual (%)</dt>
              <dd>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.tasa_interes_anual}
                  onChange={(e) => setForm((prev) => ({ ...prev, tasa_interes_anual: e.target.value }))}
                  required
                />
              </dd>

              <dt>Plazo (meses)</dt>
              <dd>
                <input
                  type="number"
                  min="1"
                  value={form.plazo_meses}
                  onChange={(e) => setForm((prev) => ({ ...prev, plazo_meses: e.target.value }))}
                  required
                />
              </dd>

              <dt>Requisitos</dt>
              <dd>
                <textarea
                  value={form.requisitosTexto}
                  onChange={(e) => setForm((prev) => ({ ...prev, requisitosTexto: e.target.value }))}
                  placeholder={"Documento de identidad\nComprobante de ingresos\nAval de empresa"}
                  rows={4}
                />
              </dd>

              <dt>Tipo activo</dt>
              <dd>
                <label className="checkbox inline">
                  <input
                    type="checkbox"
                    checked={form.activo}
                    onChange={(e) => setForm((prev) => ({ ...prev, activo: e.target.checked }))}
                  />
                  Activo
                </label>
              </dd>
            </dl>

            <div className="form-actions tipos-form__footer">
              <button type="button" className="ghost" onClick={resetForm}>
                Limpiar
              </button>
              <button type="submit" className="primary" disabled={guardando}>
                {guardando ? "Guardando..." : form.id ? "Guardar cambios" : "Crear tipo"}
              </button>
            </div>
          </form>
        </aside>
      </div>
    </section>
  );
}
