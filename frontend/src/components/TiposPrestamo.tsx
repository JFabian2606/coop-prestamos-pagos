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

const blankForm: FormState = {
  nombre: "",
  descripcion: "",
  tasa_interes_anual: "",
  plazo_meses: "12",
  requisitosTexto: "",
  activo: true,
};

const badgeActivo = (activo: boolean) => (activo ? "badge-success" : "badge-neutral");

const parseRequisitos = (texto: string) => {
  return texto
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
};

export default function TiposPrestamo() {
  const [tipos, setTipos] = useState<TipoPrestamoDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [soloActivos, setSoloActivos] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(blankForm);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  const fetchTipos = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (busqueda.trim()) params.q = busqueda.trim();
      if (soloActivos) params.soloActivos = "true";
      const { data } = await api.get<TipoPrestamoDto[]>("tipos-prestamo", { params });
      setTipos(data);
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
  }, [soloActivos, busqueda]);

  const tiposFiltrados = useMemo(() => {
    const term = busqueda.trim().toLowerCase();
    if (!term) return tipos;
    return tipos.filter((tipo) => {
      return (
        tipo.nombre.toLowerCase().includes(term) ||
        (tipo.descripcion ?? "").toLowerCase().includes(term) ||
        tipo.requisitos.some((req) => req.toLowerCase().includes(term))
      );
    });
  }, [tipos, busqueda]);

  const resetForm = () => {
    setForm(blankForm);
    setEditandoId(null);
    setOk(null);
    setError(null);
  };

  const startEdit = (tipo: TipoPrestamoDto) => {
    setForm({
      id: tipo.id,
      nombre: tipo.nombre,
      descripcion: tipo.descripcion ?? "",
      tasa_interes_anual: String(tipo.tasa_interes_anual),
      plazo_meses: String(tipo.plazo_meses),
      requisitosTexto: tipo.requisitos.join("\n"),
      activo: tipo.activo,
    });
    setEditandoId(tipo.id);
    setOk(null);
    setError(null);
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

      if (editandoId) {
        const { data } = await api.put<TipoPrestamoDto>(`tipos-prestamo/${editandoId}/`, payload);
        setOk("Tipo de prestamo actualizado.");
        setTipos((prev) => prev.map((t) => (t.id === data.id ? data : t)));
      } else {
        const { data } = await api.post<TipoPrestamoDto>("tipos-prestamo", payload);
        setOk("Tipo de prestamo creado.");
        setTipos((prev) => [data, ...prev]);
        setEditandoId(data.id);
        setForm((prev) => ({ ...prev, id: data.id }));
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
      setForm((prev) => (prev.id === data.id ? { ...prev, activo: data.activo } : prev));
      setOk(data.activo ? "Tipo activado." : "Tipo desactivado.");
    } catch (err) {
      console.error(err);
      setError("No se pudo actualizar el estado.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <section className="tipos-panel">
      <header className="tipos-header">
        <div>
          <p className="eyebrow">Configuracion</p>
          <h2>Tipos de prestamo</h2>
          <p className="subtitle">Define tasas, plazos y requisitos para personal, hipotecario, vehicular o nuevos productos.</p>
        </div>
        <div className="tipos-actions">
          <label className="search-input">
            <span>Buscar</span>
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Nombre, requisito o descripcion"
            />
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={soloActivos}
              onChange={(e) => setSoloActivos(e.target.checked)}
            />
            Mostrar solo activos
          </label>
          <button className="ghost" onClick={() => void fetchTipos()} disabled={loading}>
            {loading ? "Actualizando..." : "Actualizar"}
          </button>
          <button className="primary" onClick={resetForm}>
            Nuevo tipo
          </button>
        </div>
      </header>

      {error && <div className="alert error">{error}</div>}
      {ok && <div className="alert success">{ok}</div>}

      <div className="tipos-layout">
        <div className="tipos-table">
          <div className="tipos-table__head">
            <span>Tipo</span>
            <span>Tasa anual</span>
            <span>Plazo</span>
            <span>Requisitos</span>
            <span>Estado</span>
            <span>Acciones</span>
          </div>
          <div className="tipos-table__body">
            {tiposFiltrados.length === 0 && (
              <div className="tipos-empty">
                {loading ? "Cargando tipos de prestamo..." : "No hay tipos configurados para este filtro."}
              </div>
            )}
            {tiposFiltrados.map((tipo) => (
              <div key={tipo.id} className="tipos-row" role="button" onClick={() => startEdit(tipo)}>
                <div>
                  <p className="tipo-title">{tipo.nombre}</p>
                  <p className="tipo-desc">{tipo.descripcion || "Sin descripcion"}</p>
                </div>
                <span>{Number(tipo.tasa_interes_anual).toFixed(2)}%</span>
                <span>{tipo.plazo_meses} meses</span>
                <div className="requisitos-chips">
                  {tipo.requisitos.length === 0 && <span className="chip chip-neutral">Sin requisitos</span>}
                  {tipo.requisitos.slice(0, 3).map((req, idx) => (
                    <span key={idx} className="chip chip-outline">
                      {req}
                    </span>
                  ))}
                  {tipo.requisitos.length > 3 && (
                    <span className="chip chip-outline">+{tipo.requisitos.length - 3}</span>
                  )}
                </div>
                <span className={`badge ${badgeActivo(tipo.activo)}`}>{tipo.activo ? "Activo" : "Inactivo"}</span>
                <div className="row-actions">
                  <button className="ghost small" onClick={(e) => { e.stopPropagation(); startEdit(tipo); }}>
                    Editar
                  </button>
                  <button
                    className="ghost small"
                    onClick={(e) => {
                      e.stopPropagation();
                      void toggleActivo(tipo);
                    }}
                    disabled={guardando}
                  >
                    {tipo.activo ? "Desactivar" : "Activar"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="tipos-form-card">
          <div className="tipos-form__header">
            <div>
              <p className="eyebrow">{editandoId ? "Edicion" : "Nuevo registro"}</p>
              <h3>{editandoId ? "Editar tipo de prestamo" : "Crear tipo de prestamo"}</h3>
              <p className="subtitle">Completa los parametros que se usaran al originar nuevos creditos.</p>
            </div>
            {editandoId && (
              <span className={`badge ${badgeActivo(form.activo)}`}>{form.activo ? "Activo" : "Inactivo"}</span>
            )}
          </div>
          <form className="tipos-form" onSubmit={handleSubmit}>
            <label className="form-field">
              <span>Nombre *</span>
              <input
                type="text"
                value={form.nombre}
                onChange={(e) => setForm((prev) => ({ ...prev, nombre: e.target.value }))}
                placeholder="Personal, Hipotecario, Vehicular..."
                required
              />
            </label>

            <label className="form-field">
              <span>Descripcion</span>
              <textarea
                value={form.descripcion}
                onChange={(e) => setForm((prev) => ({ ...prev, descripcion: e.target.value }))}
                placeholder="Ej: Libre inversion con descuento por nomina."
                rows={3}
              />
            </label>

            <div className="form-grid">
              <label className="form-field">
                <span>Tasa interes anual (%) *</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.tasa_interes_anual}
                  onChange={(e) => setForm((prev) => ({ ...prev, tasa_interes_anual: e.target.value }))}
                  required
                />
              </label>
              <label className="form-field">
                <span>Plazo (meses) *</span>
                <input
                  type="number"
                  min="1"
                  value={form.plazo_meses}
                  onChange={(e) => setForm((prev) => ({ ...prev, plazo_meses: e.target.value }))}
                  required
                />
              </label>
            </div>

            <label className="form-field">
              <span>Requisitos (uno por linea o coma)</span>
              <textarea
                value={form.requisitosTexto}
                onChange={(e) => setForm((prev) => ({ ...prev, requisitosTexto: e.target.value }))}
                placeholder="Documento de identidad
Comprobante de ingresos
Aval de empresa"
                rows={4}
              />
            </label>

            {editandoId && (
              <label className="checkbox inline">
                <input
                  type="checkbox"
                  checked={form.activo}
                  onChange={(e) => setForm((prev) => ({ ...prev, activo: e.target.checked }))}
                />
                Tipo activo
              </label>
            )}

            <div className="form-actions">
              <button type="button" className="ghost" onClick={resetForm}>
                Limpiar
              </button>
              <button type="submit" className="primary" disabled={guardando}>
                {guardando ? "Guardando..." : editandoId ? "Guardar cambios" : "Crear tipo"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
