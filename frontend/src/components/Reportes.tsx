import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import "../styles/Reportes.css";

type Entidad = "todos" | "socios" | "prestamos";

type SocioReporte = {
  id: string;
  nombre: string;
  documento?: string | null;
  estado: string;
  email?: string | null;
  created_at?: string | null;
  fecha_alta?: string | null;
};

type PrestamoReporte = {
  id: string;
  monto: number | string;
  estado: string;
  estado_visible?: string;
  fecha_desembolso?: string | null;
  fecha_vencimiento?: string | null;
  socio?: {
    id?: string | null;
    nombre?: string | null;
    documento?: string | null;
    estado?: string | null;
  };
  tipo?: {
    id?: string | null;
    nombre?: string | null;
  };
  total_pagado?: number | string;
  saldo_pendiente?: number | string;
  desembolsos?: number;
};

type ReporteData = {
  filtros: {
    entidad: string;
    estado: string[];
    desde: string | null;
    hasta: string | null;
    tipo: string | null;
    limit: number;
  };
  socios: {
    items: SocioReporte[];
    resumen: Record<string, number>;
    total: number;
  } | null;
  prestamos: {
    items: PrestamoReporte[];
    resumen: Record<string, number>;
    total: number;
  } | null;
};

type TipoPrestamoDto = {
  id: string;
  nombre: string;
};

const currency = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

const estadoSociosOpts = [
  { value: "activo", label: "Activos" },
  { value: "inactivo", label: "Inactivos" },
  { value: "suspendido", label: "Suspendidos" },
];

const estadoPrestamoOpts = [
  { value: "aprobado", label: "Aprobados" },
  { value: "desembolsado", label: "Desembolsados" },
  { value: "moroso", label: "Morosos" },
  { value: "pagado", label: "Pagados" },
  { value: "cancelado", label: "Cancelados" },
];

export default function Reportes() {
  const [entidad, setEntidad] = useState<Entidad>("todos");
  const [estados, setEstados] = useState<string[]>([]);
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [tipo, setTipo] = useState("");
  const [tipos, setTipos] = useState<TipoPrestamoDto[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [data, setData] = useState<ReporteData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportando, setExportando] = useState(false);

  const fetchTipos = async () => {
    try {
      const { data: tiposData } = await api.get<TipoPrestamoDto[]>("tipos-prestamo");
      setTipos(tiposData);
    } catch (err) {
      console.error("No se pudieron cargar tipos de prestamo", err);
    }
  };

  useEffect(() => {
    void fetchTipos();
    void fetchReportes();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchReportes = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {
        entidad,
      };
      if (estados.length > 0) params.estado = estados.join(",");
      if (fechaDesde) params.desde = fechaDesde;
      if (fechaHasta) params.hasta = fechaHasta;
      if (tipo) params.tipo = tipo;
      if (busqueda.trim()) params.q = busqueda.trim();
      const { data } = await api.get<ReporteData>("reportes", { params });
      setData(data);
    } catch (err: any) {
      const detail = err?.response?.data?.detail || "No pudimos cargar el reporte.";
      setError(typeof detail === "string" ? detail : "No pudimos cargar el reporte.");
    } finally {
      setLoading(false);
    }
  };

  const handleExportPdf = async () => {
    setExportando(true);
    setError(null);
    try {
      const params: Record<string, string> = {
        entidad,
        export: "pdf",
      };
      if (estados.length > 0) params.estado = estados.join(",");
      if (fechaDesde) params.desde = fechaDesde;
      if (fechaHasta) params.hasta = fechaHasta;
      if (tipo) params.tipo = tipo;
      if (busqueda.trim()) params.q = busqueda.trim();
      const html = buildPdfHtml();
      const w = window.open("", "_blank", "width=900,height=1200");
      if (!w) throw new Error("No se pudo abrir la ventana de exportacion.");
      w.document.write(html);
      w.document.close();
      w.focus();
      w.print();
    } catch (err: any) {
      const detail = err?.response?.data?.detail || "No pudimos exportar el PDF.";
      setError(typeof detail === "string" ? detail : "No pudimos exportar el PDF.");
    } finally {
      setExportando(false);
    }
  };

  const toggleEstado = (valor: string) => {
    setEstados((prev) => (prev.includes(valor) ? prev.filter((e) => e !== valor) : [...prev, valor]));
  };

  const resetFiltros = () => {
    setEntidad("todos");
    setEstados([]);
    setFechaDesde("");
    setFechaHasta("");
    setTipo("");
  };

  const resumenSocios = data?.socios?.resumen ?? {};
  const resumenPrestamos = data?.prestamos?.resumen ?? {};

  const estadosDisponibles = useMemo(() => {
    if (entidad === "socios") return estadoSociosOpts;
    if (entidad === "prestamos") return estadoPrestamoOpts;
    return [...estadoSociosOpts, ...estadoPrestamoOpts];
  }, [entidad]);

  return (
    <section className="reportes-panel">
      <header className="reportes-header">
        <div>
          <p className="eyebrow">Reportes</p>
          <h2>Indicadores y cierres</h2>
          <p className="subtitle">Filtra por fechas, estado y tipo. Exporta un PDF con el resumen.</p>
        </div>
        <div className="reportes-actions">
          <button className="ghost" onClick={resetFiltros} disabled={loading}>
            Limpiar filtros
          </button>
          <button className="primary" onClick={() => void fetchReportes()} disabled={loading}>
            {loading ? "Actualizando..." : "Aplicar filtros"}
          </button>
          <button className="ghost" onClick={() => void handleExportPdf()} disabled={exportando || loading}>
            {exportando ? "Generando..." : "Exportar PDF"}
          </button>
        </div>
      </header>

      <div className="filtros-grid">
        <label className="filtro">
          <span>Entidad</span>
          <select value={entidad} onChange={(e) => setEntidad(e.target.value as Entidad)}>
            <option value="todos">Socios y prestamos</option>
            <option value="socios">Solo socios</option>
            <option value="prestamos">Solo prestamos</option>
          </select>
        </label>
        <label className="filtro">
          <span>Busqueda (doc, socio, prestamo)</span>
          <input
            type="text"
            placeholder="Documento, socio o ID de prestamo"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </label>
        <label className="filtro">
          <span>Desde</span>
          <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
        </label>
        <label className="filtro">
          <span>Hasta</span>
          <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
        </label>
        <label className="filtro">
          <span>Tipo de prestamo</span>
          <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="">Todos</option>
            {tipos.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="estado-filtros">
        <span className="estado-filtros__label">Estados</span>
        <div className="estado-filtros__options">
          {estadosDisponibles.map((opt) => (
            <label key={opt.value} className="pill-checkbox">
              <input
                type="checkbox"
                checked={estados.includes(opt.value)}
                onChange={() => toggleEstado(opt.value)}
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}

      <div className="resumen-grid">
        {data?.socios && (
          <article className="summary-card">
            <p className="eyebrow">Socios</p>
            <h3>{data.socios.total}</h3>
            <p className="muted">Total encontrados</p>
            <div className="summary-tags">
              <span>Activos: {resumenSocios["activo"] ?? 0}</span>
              <span>Inactivos: {resumenSocios["inactivo"] ?? 0}</span>
              <span>Suspendidos: {resumenSocios["suspendido"] ?? 0}</span>
            </div>
          </article>
        )}
        {data?.prestamos && (
          <article className="summary-card">
            <p className="eyebrow">Prestamos</p>
            <h3>{data.prestamos.total}</h3>
            <p className="muted">Total encontrados</p>
            <div className="summary-tags">
              <span>Aprobados: {resumenPrestamos["aprobado"] ?? 0}</span>
              <span>Desembolsados: {resumenPrestamos["desembolsado"] ?? 0}</span>
              <span>Morosos: {resumenPrestamos["moroso"] ?? 0}</span>
              <span>Pagados: {resumenPrestamos["pagado"] ?? 0}</span>
            </div>
          </article>
        )}
      </div>

      <div className="reportes-layout">
        {data?.socios && (
          <section className="panel-section">
            <div className="panel-section__head">
              <div>
                <p className="eyebrow">Socios</p>
                <h4>Listado filtrado</h4>
              </div>
              <p className="muted small">{data.socios.items.length} mostrados</p>
            </div>
            <div className="reportes-table">
              <div className="reportes-table__head">
                <span>Nombre</span>
                <span>Documento</span>
                <span>Estado</span>
                <span>Alta</span>
              </div>
              <div className="reportes-table__body">
                {data.socios.items.length === 0 && <p className="muted">Sin resultados para los filtros.</p>}
                {data.socios.items.map((socio) => (
                  <div className="reportes-row" key={socio.id}>
                    <span>
                      <strong>{socio.nombre}</strong>
                      <small>{socio.email ?? ""}</small>
                    </span>
                    <span>{socio.documento ?? "-"}</span>
                    <span className={`status-pill status-pill--${socio.estado}`}>{socio.estado}</span>
                    <span>{socio.created_at ? String(socio.created_at).slice(0, 10) : "-"}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {data?.prestamos && (
          <section className="panel-section">
            <div className="panel-section__head">
              <div>
                <p className="eyebrow">Prestamos</p>
                <h4>Listado filtrado</h4>
              </div>
              <p className="muted small">{data.prestamos.items.length} mostrados</p>
            </div>
            <div className="reportes-table">
              <div className="reportes-table__head">
                <span>Socio</span>
                <span>Tipo</span>
                <span>Estado</span>
                <span>Monto</span>
                <span>Desembolso</span>
              </div>
              <div className="reportes-table__body">
                {data.prestamos.items.length === 0 && <p className="muted">Sin resultados para los filtros.</p>}
                {data.prestamos.items.map((prestamo) => (
                  <div className="reportes-row" key={prestamo.id}>
                    <span>
                      <strong>{prestamo.socio?.nombre ?? "-"}</strong>
                      <small>{prestamo.socio?.documento ?? ""}</small>
                    </span>
                    <span>{prestamo.tipo?.nombre ?? "-"}</span>
                    <span className={`status-pill status-pill--${prestamo.estado_visible || prestamo.estado}`}>
                      {prestamo.estado_visible || prestamo.estado}
                    </span>
                    <span>{currency.format(Number(prestamo.monto || 0))}</span>
                    <span>{prestamo.fecha_desembolso ?? "-"}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
    </section>
  );
}
  const buildPdfHtml = () => {
    const fecha = new Date().toLocaleString("es-CO");
    const socioRows =
      data?.socios?.items
        .map(
          (s) => `
        <tr>
          <td>${s.nombre || ""}</td>
          <td>${s.documento || ""}</td>
          <td>${s.estado || ""}</td>
          <td>${s.created_at ? String(s.created_at).slice(0, 10) : ""}</td>
        </tr>`
        )
        .join("") || "";
    const prestRows =
      data?.prestamos?.items
        .map(
          (p) => `
        <tr>
          <td>${p.socio?.nombre || ""}</td>
          <td>${p.tipo?.nombre || ""}</td>
          <td>${p.estado_visible || p.estado || ""}</td>
          <td>${currency.format(Number(p.monto || 0))}</td>
          <td>${p.fecha_desembolso || ""}</td>
        </tr>`
        )
        .join("") || "";
    return `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Reporte Cooprestamos</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 24px; color: #111; }
    h1 { margin: 0 0 6px; }
    .muted { color: #6b7280; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th, td { border: 1px solid #e5e7eb; padding: 6px; font-size: 12px; text-align: left; }
    th { background: #f8fafc; }
    .pill { display: inline-block; padding: 2px 8px; border-radius: 12px; background: #e6f4f1; color: #0f766e; font-weight: 700; font-size: 11px; }
    .section { margin-top: 16px; }
  </style>
</head>
<body>
  <h1>Reporte de gestion</h1>
  <p class="muted">Generado: ${fecha}</p>
  <p class="muted">Entidad: ${entidad}, Estados: ${estados.join(",") || "todos"}, Rango: ${fechaDesde || "-"} a ${fechaHasta || "-"}, Tipo: ${tipo || "todos"}, Busqueda: ${busqueda || "-"}</p>
  ${
    data?.socios
      ? `<div class="section">
    <h3>Socios <span class="pill">Total ${data.socios.total}</span></h3>
    <table>
      <thead><tr><th>Nombre</th><th>Documento</th><th>Estado</th><th>Alta</th></tr></thead>
      <tbody>${socioRows || "<tr><td colspan='4'>Sin resultados</td></tr>"}</tbody>
    </table>
  </div>`
      : ""
  }
  ${
    data?.prestamos
      ? `<div class="section">
    <h3>Prestamos <span class="pill">Total ${data.prestamos.total}</span></h3>
    <table>
      <thead><tr><th>Socio</th><th>Tipo</th><th>Estado</th><th>Monto</th><th>Desembolso</th></tr></thead>
      <tbody>${prestRows || "<tr><td colspan='5'>Sin resultados</td></tr>"}</tbody>
    </table>
  </div>`
      : ""
  }
</body>
</html>`;
  };
