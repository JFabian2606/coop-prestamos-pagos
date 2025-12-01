import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { SocioDto } from "./SociosViewer";
import "../styles/HistorialCrediticio.css";

type PagoDto = {
  id: number;
  monto: string;
  fecha_pago: string;
  metodo: string;
  referencia: string;
  created_at: string;
};

type PrestamoDto = {
  id: string;
  monto: string;
  estado: "activo" | "pagado" | "moroso" | "cancelado";
  fecha_desembolso: string;
  fecha_vencimiento: string | null;
  descripcion: string;
  created_at: string;
  updated_at: string;
  pagos: PagoDto[];
  total_pagado: string;
  saldo_pendiente: string;
};

type ResumenHistorial = {
  prestamos_totales: number;
  prestamos_activos: number;
  prestamos_morosos: number;
  prestamos_pagados: number;
  pagos_registrados: number;
  saldo_pendiente_total: string;
};

type HistorialResponse = {
  socio: SocioDto;
  prestamos: PrestamoDto[];
  resumen: ResumenHistorial;
};

const estadoLabels: Record<PrestamoDto["estado"], string> = {
  activo: "Activo",
  pagado: "Pagado",
  moroso: "Moroso",
  cancelado: "Cancelado",
};

const estadoClass: Record<PrestamoDto["estado"], string> = {
  activo: "badge-success",
  pagado: "badge-primary",
  moroso: "badge-danger",
  cancelado: "badge-neutral",
};

const currency = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export default function HistorialCrediticio() {
  const [socios, setSocios] = useState<SocioDto[]>([]);
  const [socioId, setSocioId] = useState<string>("");
  const [estadoFiltro, setEstadoFiltro] = useState<"todos" | PrestamoDto["estado"]>("todos");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [data, setData] = useState<HistorialResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cargarSocios = async () => {
      try {
        const { data: resp } = await api.get<SocioDto[]>("socios");
        setSocios(resp);
        if (resp.length > 0) {
          setSocioId(resp[0].id);
        }
      } catch (err) {
        console.error(err);
        setError("No se pudo cargar la lista de socios.");
      }
    };
    void cargarSocios();
  }, []);

  useEffect(() => {
    if (!socioId) return;
    const fetchHistorial = async () => {
      setLoading(true);
      setError(null);
      try {
        const params: Record<string, string> = {};
        if (estadoFiltro !== "todos") params.estado = estadoFiltro;
        if (desde) params.desde = desde;
        if (hasta) params.hasta = hasta;
        const { data: resp } = await api.get<HistorialResponse>(`socios/${socioId}/historial/`, { params });
        setData(resp);
      } catch (err) {
        console.error(err);
        setError("No se pudo cargar el historial crediticio.");
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    void fetchHistorial();
  }, [socioId, estadoFiltro, desde, hasta]);

  const pagosPlano = useMemo(() => {
    if (!data) return [];
    const items: Array<PagoDto & { prestamoEstado: PrestamoDto["estado"]; prestamoId: string }> = [];
    data.prestamos.forEach((prestamo) => {
      prestamo.pagos.forEach((pago) => {
        items.push({
          ...pago,
          prestamoEstado: prestamo.estado,
          prestamoId: prestamo.id,
        });
      });
    });
    return items.sort((a, b) => b.fecha_pago.localeCompare(a.fecha_pago));
  }, [data]);

  return (
    <section className="historial-panel">
      <header className="historial-header">
        <div>
          <p className="eyebrow">Control de riesgo</p>
          <h2>Historial crediticio</h2>
          <p className="subtitle">
            Consulta préstamos previos y pagos registrados antes de aprobar un nuevo desembolso.
          </p>
        </div>
        <div className="filters-bar">
          <label className="filter-field">
            <span>Socio</span>
            <select value={socioId} onChange={(e) => setSocioId(e.target.value)}>
              {socios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre_completo} ({s.documento ?? "sin doc"})
                </option>
              ))}
            </select>
          </label>
          <label className="filter-field">
            <span>Estado del préstamo</span>
            <select value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value as any)}>
              <option value="todos">Todos</option>
              <option value="activo">Activos</option>
              <option value="moroso">Morosos</option>
              <option value="pagado">Pagados</option>
            </select>
          </label>
          <label className="filter-field">
            <span>Desde</span>
            <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
          </label>
          <label className="filter-field">
            <span>Hasta</span>
            <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
          </label>
        </div>
      </header>

      {error && <div className="alert error">{error}</div>}
      {loading && <div className="alert muted">Cargando historial...</div>}

      {!data && !loading && <p className="muted">Selecciona un socio para revisar su historial.</p>}
      {data && (
        <>
          <div className="summary-grid">
            <article className="summary-card">
              <p className="summary-label">Préstamos totales</p>
              <p className="summary-value">{data.resumen.prestamos_totales}</p>
              <p className="summary-meta">Activos: {data.resumen.prestamos_activos}</p>
            </article>
            <article className="summary-card">
              <p className="summary-label">Pagados</p>
              <p className="summary-value">{data.resumen.prestamos_pagados}</p>
              <p className="summary-meta">Pagos registrados: {data.resumen.pagos_registrados}</p>
            </article>
            <article className="summary-card warning">
              <p className="summary-label">Morosos</p>
              <p className="summary-value">{data.resumen.prestamos_morosos}</p>
              <p className="summary-meta">Revisión prioritaria</p>
            </article>
            <article className="summary-card dark">
              <p className="summary-label">Saldo pendiente</p>
              <p className="summary-value">{currency.format(Number(data.resumen.saldo_pendiente_total))}</p>
              <p className="summary-meta">Incluye cuotas vencidas</p>
            </article>
          </div>

          <div className="historial-grid">
            <section className="panel-section loan-table">
              <div className="section-heading">
                <h3>Préstamos previos</h3>
                <p className="section-description">
                  Estados y montos históricos del socio seleccionado.
                </p>
              </div>
              {data.prestamos.length === 0 && <p className="muted">No hay préstamos para los filtros aplicados.</p>}
              {data.prestamos.length > 0 && (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Estado</th>
                        <th>Monto</th>
                        <th>Desembolso</th>
                        <th>Vencimiento</th>
                        <th>Pagado</th>
                        <th>Saldo</th>
                        <th>Pagos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.prestamos.map((prestamo) => (
                        <tr key={prestamo.id}>
                          <td>
                            <span className={`badge ${estadoClass[prestamo.estado]}`}>
                              {estadoLabels[prestamo.estado]}
                            </span>
                          </td>
                          <td>{currency.format(Number(prestamo.monto))}</td>
                          <td>{prestamo.fecha_desembolso}</td>
                          <td>{prestamo.fecha_vencimiento ?? "—"}</td>
                          <td>{currency.format(Number(prestamo.total_pagado))}</td>
                          <td>{currency.format(Number(prestamo.saldo_pendiente))}</td>
                          <td>{prestamo.pagos.length}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="panel-section timeline">
              <div className="section-heading">
                <h3>Pagos registrados</h3>
                <p className="section-description">Detalle de abonos aplicados por rango de fechas.</p>
              </div>
              {pagosPlano.length === 0 && <p className="muted">Sin pagos para los filtros aplicados.</p>}
              <ul className="timeline-list">
                {pagosPlano.map((pago) => (
                  <li key={pago.id} className="timeline-item">
                    <div className={`dot ${estadoClass[pago.prestamoEstado]}`} />
                    <div>
                      <p className="timeline-title">
                        {currency.format(Number(pago.monto))} • {pago.metodo || "Método no indicado"}
                      </p>
                      <p className="timeline-meta">
                        {pago.fecha_pago} · Préstamo #{pago.prestamoId.slice(0, 8)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </>
      )}
    </section>
  );
}
