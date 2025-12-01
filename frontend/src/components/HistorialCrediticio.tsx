import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import type { SocioDto } from "./SociosViewer";
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
  monto_en_mora: string;
  dias_en_mora: number;
  cuotas_vencidas: number;
};

type ResumenHistorial = {
  prestamos_totales: number;
  prestamos_activos: number;
  prestamos_morosos: number;
  prestamos_pagados: number;
  pagos_registrados: number;
  saldo_pendiente_total: string;
  monto_en_mora_total: string;
  dias_en_mora_max: number;
  dias_en_mora_promedio: number;
  cuotas_vencidas_total: number;
  prestamos_en_mora: number;
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
  const [socioId, setSocioId] = useState<string>("all");
  const [estadoFiltro, setEstadoFiltro] = useState<"todos" | PrestamoDto["estado"]>("todos");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [data, setData] = useState<HistorialResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    const cargarSocios = async () => {
      try {
        const { data: resp } = await api.get<SocioDto[]>("socios");
        setSocios(resp);
      } catch (err) {
        console.error(err);
        setError("No se pudo cargar la lista de socios.");
      }
    };
    void cargarSocios();
  }, []);

  useEffect(() => {
    const fetchHistorial = async () => {
      setLoading(true);
      setError(null);
      try {
        const params: Record<string, string> = {};
        if (estadoFiltro !== "todos") params.estado = estadoFiltro;
        if (desde) params.desde = desde;
        if (hasta) params.hasta = hasta;
        const endpoint = socioId === "all" ? "socios/historial/" : `socios/${socioId}/historial/`;
        const { data: resp } = await api.get<HistorialResponse>(endpoint, { params });
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
    const term = busqueda.trim().toLowerCase();
    const items: Array<PagoDto & { prestamoEstado: PrestamoDto["estado"]; prestamoId: string; descripcion: string }> = [];
    data.prestamos.forEach((prestamo) => {
      prestamo.pagos.forEach((pago) => {
        items.push({
          ...pago,
          prestamoEstado: prestamo.estado,
          prestamoId: prestamo.id,
          descripcion: prestamo.descripcion,
        });
      });
    });
    const filtered = term
      ? items.filter((p) => {
          return (
            p.metodo.toLowerCase().includes(term) ||
            p.referencia.toLowerCase().includes(term) ||
            p.descripcion.toLowerCase().includes(term) ||
            p.prestamoId.toLowerCase().includes(term)
          );
        })
      : items;
    return filtered.sort((a, b) => b.fecha_pago.localeCompare(a.fecha_pago));
  }, [data, busqueda]);

  const prestamosFiltrados = useMemo(() => {
    if (!data) return [];
    const term = busqueda.trim().toLowerCase();
    if (!term) return data.prestamos;
    return data.prestamos.filter((prestamo) => {
      return (
        prestamo.descripcion.toLowerCase().includes(term) ||
        prestamo.estado.toLowerCase().includes(term) ||
        prestamo.id.toLowerCase().includes(term)
      );
    });
  }, [data, busqueda]);

  return (
    <section className="historial-panel">
      <header className="historial-header">
        <div>
          <h1 className="page-title">Historial crediticio</h1>
          <p className="subtitle">Control de riesgo • Consulta préstamos previos y pagos antes de autorizar.</p>
        </div>
        <div className="filters-bar">
          <label className="filter-field">
            <span>Socio</span>
            <select value={socioId} onChange={(e) => setSocioId(e.target.value)}>
              <option value="all">Todos los socios</option>
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
          <label className="filter-field filter-full">
            <span>Buscar</span>
            <input
              type="search"
              placeholder="Descripción, estado o referencia"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
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
              <p className="summary-meta">
                Activos: {data.resumen.prestamos_activos} · Pagados: {data.resumen.prestamos_pagados}
              </p>
            </article>
            <article className="summary-card warning">
              <p className="summary-label">Morosos</p>
              <p className="summary-value accent">{data.resumen.prestamos_morosos}</p>
              <p className="summary-meta">Revisión prioritaria</p>
            </article>
            <article className="summary-card success strong">
              <p className="summary-label">Saldo pendiente</p>
              <p className="summary-value accent">{currency.format(Number(data.resumen.saldo_pendiente_total))}</p>
              <p className="summary-meta">Incluye cuotas vencidas</p>
            </article>
            <article className="summary-card danger strong">
              <p className="summary-label">Monto en mora</p>
              <p className="summary-value accent">{currency.format(Number(data.resumen.monto_en_mora_total))}</p>
              <p className="summary-meta">Préstamos en mora: {data.resumen.prestamos_en_mora}</p>
            </article>
            <article className="summary-card">
              <p className="summary-label">Cuotas vencidas</p>
              <p className="summary-value">{data.resumen.cuotas_vencidas_total}</p>
              <p className="summary-meta">Días mora máx: {data.resumen.dias_en_mora_max}</p>
            </article>
            <article className="summary-card">
              <p className="summary-label">Días en mora (promedio)</p>
              <p className="summary-value">{data.resumen.dias_en_mora_promedio}</p>
              <p className="summary-meta">Máximo: {data.resumen.dias_en_mora_max}</p>
            </article>
          </div>

          <div className="historial-grid">
            <section className="panel-section loan-table">
              <div className="section-heading">
                <h3>Préstamos previos</h3>
                <p className="section-description">Estados y montos históricos del socio seleccionado.</p>
              </div>
              {prestamosFiltrados.length === 0 && <p className="muted">No hay préstamos para los filtros aplicados.</p>}
              {prestamosFiltrados.length > 0 && (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Estado</th>
                        <th>Monto</th>
                        <th>Desembolso</th>
                        <th>Vencimiento</th>
                        <th className="align-right">Pagado</th>
                        <th className="align-right">Saldo</th>
                        <th className="align-right">Monto en mora</th>
                        <th className="align-right">Días mora</th>
                        <th className="align-right">Cuotas vencidas</th>
                        <th className="align-right">Pagos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {prestamosFiltrados.map((prestamo) => (
                        <tr key={prestamo.id}>
                          <td>
                            <span className={`badge ${estadoClass[prestamo.estado]}`}>
                              {estadoLabels[prestamo.estado]}
                            </span>
                          </td>
                          <td className="align-right">{currency.format(Number(prestamo.monto))}</td>
                          <td>{prestamo.fecha_desembolso}</td>
                          <td>{prestamo.fecha_vencimiento ?? "—"}</td>
                          <td className="align-right">{currency.format(Number(prestamo.total_pagado))}</td>
                          <td className="align-right">{currency.format(Number(prestamo.saldo_pendiente))}</td>
                          <td className="align-right">{currency.format(Number(prestamo.monto_en_mora))}</td>
                          <td className="align-right">{prestamo.dias_en_mora}</td>
                          <td className="align-right">{prestamo.cuotas_vencidas}</td>
                          <td className="align-right">{prestamo.pagos.length}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="panel-section timeline sticky-panel">
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
                        {currency.format(Number(pago.monto))} · {pago.metodo || "Método no indicado"}
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
