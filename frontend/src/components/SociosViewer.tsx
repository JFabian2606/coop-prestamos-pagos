import { AxiosError, isAxiosError } from "axios";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, MouseEvent } from "react";
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

const estadoTransitions: Record<SocioDto["estado"], SocioDto["estado"][]> = {
  activo: ["inactivo", "suspendido"],
  inactivo: ["activo"],
  suspendido: ["activo"],
};

type EditFormState = {
  nombre_completo: string;
  documento: string;
  telefono: string;
  direccion: string;
  datos_fiscales: string;
};

export default function SociosViewer() {
  const [socios, setSocios] = useState<SocioDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<"todos" | SocioDto["estado"]>("todos");
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const [estadoMenuPara, setEstadoMenuPara] = useState<string | null>(null);
  const [estadoLoading, setEstadoLoading] = useState<string | null>(null);
  const [accionError, setAccionError] = useState<string | null>(null);
  const [accionOk, setAccionOk] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [exportando, setExportando] = useState(false);
  const [editModalAbierta, setEditModalAbierta] = useState(false);
  const [editando, setEditando] = useState(false);
  const [formEdicion, setFormEdicion] = useState<EditFormState>({
    nombre_completo: "",
    documento: "",
    telefono: "",
    direccion: "",
    datos_fiscales: "",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteEnProgreso, setDeleteEnProgreso] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchSocios = useCallback(async () => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);
    setAccionError(null);
    setAccionOk(null);
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

  useEffect(() => {
    const closeMenus = () => setEstadoMenuPara(null);
    document.addEventListener("click", closeMenus);
    return () => document.removeEventListener("click", closeMenus);
  }, []);

  useEffect(() => {
    setEstadoMenuPara(null);
  }, [seleccionado]);

  const sociosFiltrados = useMemo(() => {
    const term = busqueda.trim().toLowerCase();
    let resultado = socios;
    if (filtro !== "todos") {
      resultado = resultado.filter((s) => s.estado === filtro);
    }
    if (term) {
      resultado = resultado.filter((s) => {
        const doc = s.documento?.toLowerCase() ?? "";
        const email = s.email?.toLowerCase() ?? "";
        return (
          s.nombre_completo.toLowerCase().includes(term) ||
          doc.includes(term) ||
          email.includes(term) ||
          s.id.toLowerCase().includes(term)
        );
      });
    }
    return resultado;
  }, [filtro, socios, busqueda]);

  const socioActivo = useMemo(() => {
    if (seleccionado) {
      return socios.find((s) => s.id === seleccionado) ?? null;
    }
    return null;
  }, [seleccionado, socios]);

  const getErrorMessage = (err: unknown, fallback: string) => {
    if (isAxiosError(err)) {
      const data = err.response?.data as any;
      return (
        data?.detail ||
        data?.estado?.[0] ||
        data?.nombre_completo?.[0] ||
        data?.documento?.[0] ||
        data?.non_field_errors?.[0] ||
        fallback
      );
    }
    return fallback;
  };

  const upsertSocio = (actualizado: SocioDto) => {
    setSocios((prev) => prev.map((s) => (s.id === actualizado.id ? actualizado : s)));
  };

  const handleEstadoChange = async (socioId: string, nuevoEstado: SocioDto["estado"]) => {
    setEstadoLoading(socioId);
    setAccionError(null);
    setAccionOk(null);
    try {
      const { data } = await api.patch<SocioDto>(`socios/${socioId}/estado/`, { estado: nuevoEstado });
      upsertSocio(data);
      setSeleccionado(data.id);
      setAccionOk(`Estado actualizado a ${estadoLabels[nuevoEstado]}`);
    } catch (err) {
      setAccionError(getErrorMessage(err, "No se pudo cambiar el estado."));
    } finally {
      setEstadoLoading(null);
      setEstadoMenuPara(null);
    }
  };

  const handleExportarExcel = async () => {
    setExportando(true);
    setAccionError(null);
    setAccionOk(null);
    try {
      const params: Record<string, string> = {};
      if (filtro !== "todos") {
        params.estado = filtro;
      }
      const { data } = await api.get<ArrayBuffer>("socios/export/", {
        params,
        responseType: "arraybuffer",
      });
      const blob = new Blob([data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const stamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
      link.download = `socios_auditoria_${stamp}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setAccionOk("Exportacion generada.");
    } catch (err) {
      setAccionError(getErrorMessage(err, "No se pudo exportar el Excel."));
    } finally {
      setExportando(false);
    }
  };

  const abrirEdicion = () => {
    if (!socioActivo) return;
    setFormEdicion({
      nombre_completo: socioActivo.nombre_completo ?? "",
      documento: socioActivo.documento ?? "",
      telefono: socioActivo.telefono ?? "",
      direccion: socioActivo.direccion ?? "",
      datos_fiscales: JSON.stringify(socioActivo.datos_fiscales ?? {}, null, 2),
    });
    setFormError(null);
    setAccionError(null);
    setAccionOk(null);
    setEditModalAbierta(true);
  };

  const handleEditarSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!socioActivo) return;

    if (!formEdicion.nombre_completo.trim()) {
      setFormError("El nombre es obligatorio.");
      return;
    }

    let datosFiscalesParsed: Record<string, any> = {};
    try {
      datosFiscalesParsed = formEdicion.datos_fiscales.trim()
        ? JSON.parse(formEdicion.datos_fiscales)
        : {};
    } catch (_err) {
      setFormError("Datos fiscales debe ser un JSON válido.");
      return;
    }

    setEditando(true);
    setFormError(null);
    setAccionError(null);
    setAccionOk(null);

    try {
      const payload = {
        nombre_completo: formEdicion.nombre_completo.trim(),
        documento: formEdicion.documento.trim() || null,
        telefono: formEdicion.telefono.trim() || null,
        direccion: formEdicion.direccion.trim() || null,
        datos_fiscales: datosFiscalesParsed,
      };
      const { data } = await api.put<SocioDto>(`socios/${socioActivo.id}/`, payload);
      upsertSocio(data);
      setSeleccionado(data.id);
      setAccionOk("Datos del socio actualizados.");
      setEditModalAbierta(false);
    } catch (err) {
      setFormError(getErrorMessage(err, "No se pudo actualizar el socio."));
    } finally {
      setEditando(false);
    }
  };

  const handleDelete = async () => {
    if (!socioActivo) return;
    const confirmar = window.confirm(
      `¿Dar de baja (inactivar) al socio "${socioActivo.nombre_completo}"?`
    );
    if (!confirmar) return;

    const socioId = socioActivo.id;
    setDeleteEnProgreso(socioId);
    setAccionError(null);
    setAccionOk(null);

    try {
      const { data } = await api.delete<SocioDto>(`socios/${socioId}/`);
      upsertSocio(data);
      setSeleccionado(data.id);
      setAccionOk("Socio inactivado (baja lógica).");
    } catch (err) {
      setAccionError(getErrorMessage(err, "No se pudo dar de baja al socio."));
    } finally {
      setDeleteEnProgreso(null);
    }
  };

  const EstadoPill = ({ socio }: { socio: SocioDto }) => {
    const opciones = estadoTransitions[socio.estado];
    const isOpen = estadoMenuPara === socio.id;
    const isLoading = estadoLoading === socio.id;

    const handleClick = (event: MouseEvent) => {
      event.stopPropagation();
      setEstadoMenuPara((prev) => (prev === socio.id ? null : socio.id));
    };

    return (
      <div className="estado-control" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className={`estado-pill estado-pill--${socio.estado} estado-pill--action`}
          onClick={handleClick}
          disabled={isLoading}
        >
          {isLoading ? "Guardando..." : estadoLabels[socio.estado]}
          <span className="estado-pill__caret">▾</span>
        </button>
        {isOpen && (
          <div className="estado-menu" onClick={(e) => e.stopPropagation()}>
            <p className="estado-menu__label">Cambiar a</p>
            {opciones.map((estado) => (
              <button
                key={estado}
                type="button"
                className="estado-option"
                onClick={() => void handleEstadoChange(socio.id, estado)}
                disabled={isLoading}
              >
                <span className={`estado-dot estado-dot--${estado}`} />
                {estadoLabels[estado]}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const EstadoBadge = ({ estado }: { estado: SocioDto["estado"] }) => (
    <span className={`estado-pill estado-pill--${estado} estado-pill--static`}>
      {estadoLabels[estado]}
    </span>
  );

  return (
    <section className="socios-panel">
      <header className="socios-panel__header">
        <div>
          <p className="eyebrow">Panel de administración</p>
          <h2>Socios registrados</h2>
          <p className="subtitle">
            Visualiza el estado actual, datos de contacto y datos fiscales.
          </p>
        </div>
        <div className="socios-panel__actions">
          <label className="search-input">
            <span>Buscar</span>
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Nombre, documento, email o ID"
            />
          </label>
          <label className="select">
            <span>Filtrar por estado</span>
            <select value={filtro} onChange={(e) => setFiltro(e.target.value as any)}>
              <option value="todos">Todos</option>
              <option value="activo">Activos</option>
              <option value="inactivo">Inactivos</option>
              <option value="suspendido">Suspendidos</option>
            </select>
          </label>
          <div className="actions-row">
            <button className="ghost" onClick={() => void fetchSocios()} disabled={loading}>
              {loading ? "Actualizando..." : "Actualizar"}
            </button>
            <button
              className="ghost"
              onClick={() => void handleExportarExcel()}
              disabled={exportando}
              title="Descargar Excel con socios y auditoria"
            >
              {exportando ? "Generando..." : "Exportar Excel"}
            </button>
          </div>
        </div>
      </header>

      {error && <div className="alert error">{error}</div>}
      {accionError && <div className="alert error">{accionError}</div>}
      {accionOk && <div className="alert success">{accionOk}</div>}

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
                <EstadoBadge estado={socio.estado} />
              </button>
            ))}
          </div>
        </div>

        <aside className="socios-detail">
          {!socioActivo && <p className="muted">Selecciona un socio para ver su detalle.</p>}
          {socioActivo && (
            <>
              <h3>{socioActivo.nombre_completo}</h3>
              <div className="socios-detail__actions">
                <button type="button" className="ghost icon-button" onClick={abrirEdicion}>
                  <i className="bx bxs-pencil icon-brand-hover" aria-hidden />
                  <span>Editar datos</span>
                </button>
                <button
                  type="button"
                  className="ghost danger-ghost skull-button"
                  onClick={() => void handleDelete()}
                  disabled={deleteEnProgreso === socioActivo.id}
                >
                  <i className="bx bxs-skull icon-brand-hover" aria-hidden />
                  {deleteEnProgreso === socioActivo.id ? "Procesando..." : "Dar de baja"}
                </button>
              </div>
              <dl>
                <dt>Documento</dt>
                <dd>{socioActivo.documento || "No registrado"}</dd>
                <dt>Telefono</dt>
                <dd>{socioActivo.telefono || "No registrado"}</dd>
                <dt>Direccion</dt>
                <dd>{socioActivo.direccion || "No registrada"}</dd>
                <dt>Estado</dt>
                <dd>
                  <EstadoPill socio={socioActivo} />
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

      {editModalAbierta && socioActivo && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal">
            <div className="modal__header">
              <h4>Editar socio</h4>
              <button
                type="button"
                className="ghost close-button"
                onClick={() => setEditModalAbierta(false)}
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>
            <form className="modal__body" onSubmit={handleEditarSubmit}>
              {formError && <div className="alert error">{formError}</div>}
              <label>
                <span>Nombre completo</span>
                <input
                  type="text"
                  value={formEdicion.nombre_completo}
                  onChange={(e) => setFormEdicion((prev) => ({ ...prev, nombre_completo: e.target.value }))}
                  required
                />
              </label>
              <label>
                <span>Documento</span>
                <input
                  type="text"
                  value={formEdicion.documento}
                  onChange={(e) => setFormEdicion((prev) => ({ ...prev, documento: e.target.value }))}
                />
              </label>
              <label>
                <span>Telefono</span>
                <input
                  type="text"
                  value={formEdicion.telefono}
                  onChange={(e) => setFormEdicion((prev) => ({ ...prev, telefono: e.target.value }))}
                />
              </label>
              <label>
                <span>Direccion</span>
                <input
                  type="text"
                  value={formEdicion.direccion}
                  onChange={(e) => setFormEdicion((prev) => ({ ...prev, direccion: e.target.value }))}
                />
              </label>
              <label>
                <span>Datos fiscales (JSON)</span>
                <textarea
                  rows={5}
                  value={formEdicion.datos_fiscales}
                  onChange={(e) => setFormEdicion((prev) => ({ ...prev, datos_fiscales: e.target.value }))}
                />
              </label>
              <div className="modal__footer">
                <button type="button" className="ghost" onClick={() => setEditModalAbierta(false)} disabled={editando}>
                  Cancelar
                </button>
                <button type="submit" disabled={editando}>
                  {editando ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

