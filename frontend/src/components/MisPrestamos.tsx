import { useEffect, useMemo, useState } from "react";
import "../styles/MisPrestamos.css";
import { api } from "../api";
import soloLogo from "../assets/solo-logo-cooprestamos-vector.svg";

type EstadoClave = "pendiente" | "aprobado" | "rechazado" | "desembolsado" | "pagado" | "moroso" | "cancelado" | string;

type Prestamo = {
  id: string;
  solicitud_id?: string;
  estado: EstadoClave;
  monto: number | string;
  cuota_mensual?: number | string | null;
  plazo_meses?: number | null;
  tipo?: { id?: string | null; nombre?: string | null } | null;
  descripcion?: string | null;
  fecha_solicitud?: string | null;
  fecha_desembolso?: string | null;
  fecha_vencimiento?: string | null;
  total_pagado?: number | string | null;
  saldo_pendiente?: number | string | null;
  cuotas_restantes?: number | null;
  tiene_desembolso?: boolean;
  puede_pagar?: boolean;
};

type PagoForm = {
  prestamoId: string;
  cuotas: number;
  metodo: string;
};

type MisPrestamosProps = {
  onVolver?: () => void;
  onSolicitar?: () => void;
  usuario?: any;
};

type ResumenEstados = {
  pendiente: number;
  aprobado: number;
  desembolsado: number;
  rechazado: number;
};

type EstadoResumenItem = {
  key: keyof ResumenEstados | "todos";
  label: string;
  tone: string;
};

const currency = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

const estadoLabels: Record<string, string> = {
  pendiente: "Pendiente",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
  desembolsado: "Desembolsado",
  pagado: "Pagado",
  moroso: "En mora",
  cancelado: "Cancelado",
};

const estadoTonos: Record<string, string> = {
  pendiente: "muted",
  aprobado: "info",
  rechazado: "danger",
  desembolsado: "success",
  pagado: "ghost",
  moroso: "warning",
  cancelado: "muted",
};

const tabs: EstadoResumenItem[] = [
  { key: "todos", label: "Todos", tone: "ghost" },
  { key: "pendiente", label: "Pendientes", tone: "muted" },
  { key: "aprobado", label: "Aprobados", tone: "info" },
  { key: "desembolsado", label: "Desembolsados", tone: "success" },
  { key: "rechazado", label: "Rechazados", tone: "danger" },
];

const normalizarPrestamo = (p: Prestamo): Prestamo => ({
  ...p,
  estado: (p.estado || "").toLowerCase(),
});

const toNumber = (value: number | string | null | undefined): number => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

export default function MisPrestamos({ onVolver, onSolicitar, usuario }: MisPrestamosProps) {
  const [prestamos, setPrestamos] = useState<Prestamo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [filtro, setFiltro] = useState<EstadoResumenItem["key"]>("todos");
  const [pago, setPago] = useState<PagoForm | null>(null);
  const [procesandoPago, setProcesandoPago] = useState(false);

  const calcularMaxCuotas = (p: Prestamo | null | undefined) => {
    if (!p) return 1;
    const restantes = toNumber(p.cuotas_restantes);
    if (restantes > 0) return restantes;
    const plazo = toNumber(p.plazo_meses);
    if (plazo > 0) return plazo;
    return 12;
  };

  const resumen = useMemo<ResumenEstados>(() => {
    const base: ResumenEstados = { pendiente: 0, aprobado: 0, desembolsado: 0, rechazado: 0 };
    prestamos.forEach((p) => {
      const key = p.estado as keyof ResumenEstados;
      if (key in base) {
        base[key] += 1;
      }
    });
    return base;
  }, [prestamos]);

  const prestamosFiltrados = useMemo(() => {
    if (filtro === "todos") return prestamos;
    return prestamos.filter((p) => p.estado === filtro);
  }, [prestamos, filtro]);

  const prestamoParaPago = useMemo(
    () => prestamos.find((p) => p.id === pago?.prestamoId),
    [prestamos, pago?.prestamoId]
  );

  const maxCuotas = useMemo(() => calcularMaxCuotas(prestamoParaPago), [prestamoParaPago]);

  const totalPago = useMemo(() => {
    if (!pago || !prestamoParaPago) return null;
    const cuota = toNumber(prestamoParaPago.cuota_mensual);
    if (cuota <= 0) return null;
    const total = cuota * pago.cuotas;
    const saldoActual = toNumber(prestamoParaPago.saldo_pendiente || prestamoParaPago.monto);
    return {
      total,
      saldoProyectado: Math.max(0, saldoActual - total),
    };
  }, [pago, prestamoParaPago]);

  const puedePagar = (p: Prestamo) =>
    (p.estado === "desembolsado" || p.puede_pagar) && toNumber(p.saldo_pendiente || p.monto) > 0;

  const cargar = async () => {
    setLoading(true);
    setError("");
    setOk("");
    try {
      const { data } = await api.get("prestamos/mis");
      const listado = Array.isArray(data?.prestamos) ? data.prestamos : Array.isArray(data) ? data : [];
      setPrestamos(listado.map((p: Prestamo) => normalizarPrestamo(p)));
    } catch (err) {
      console.error("No se pudieron cargar los prestamos", err);
      setError("No pudimos cargar tus prestamos. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void cargar();
  }, []);

  const abrirPasarela = (prestamo: Prestamo) => {
    if (!puedePagar(prestamo)) return;
    const maxPermitidas = calcularMaxCuotas(prestamo);
    const sugeridas = prestamo.cuotas_restantes || maxPermitidas;
    setPago({
      prestamoId: prestamo.id,
      cuotas: Math.min(maxPermitidas, Math.max(1, sugeridas)),
      metodo: "tarjeta",
    });
    setOk("");
    setError("");
  };

  const cerrarPasarela = () => setPago(null);

  const pagar = async () => {
    if (!pago) return;
    setProcesandoPago(true);
    setOk("");
    setError("");
    try {
      await api.post(`prestamos/${pago.prestamoId}/pago-simulado`, {
        cuotas: pago.cuotas,
        metodo: pago.metodo,
      });
      setOk("Pago simulado aplicado correctamente.");
      setPago(null);
      await cargar();
    } catch (err: any) {
      console.error("No se pudo procesar el pago", err);
      const detail = err?.response?.data?.detail || err?.response?.data?.cuotas;
      const mensaje = typeof detail === "string" ? detail : "No pudimos procesar el pago. Intenta de nuevo.";
      setError(mensaje);
    } finally {
      setProcesandoPago(false);
    }
  };

  return (
    <div className="mis-shell">
      <header className="mis-header">
        <div className="mis-brand">
          <img src={soloLogo} alt="Cooprestamos" />
          <div>
            <p className="eyebrow">Cooprestamos</p>
            <h1>Mis prestamos</h1>
            <p className="subtitle">
              Revisa el estado de tus solicitudes y, cuando esten desembolsadas, paga las cuotas en la pasarela simulada.
            </p>
          </div>
        </div>
        <div className="mis-header-actions">
          {onSolicitar && (
            <button type="button" className="ghost" onClick={onSolicitar}>
              Solicitar nuevo
            </button>
          )}
          {onVolver && (
            <button type="button" onClick={onVolver}>
              Volver
            </button>
          )}
        </div>
      </header>

      <main className="mis-body">
        {usuario?.email && <p className="mis-user">Sesion: {usuario.email}</p>}

        <section className="resumen-estado">
          {tabs.map((tab) => {
            const value =
              tab.key === "todos"
                ? prestamos.length
                : resumen[tab.key as keyof ResumenEstados] ?? 0;
            return (
              <button
                key={tab.key}
                type="button"
                className={`estado-pill ${filtro === tab.key ? "active" : ""} tone-${tab.tone}`}
                onClick={() => setFiltro(tab.key)}
              >
                <span className="pill-label">{tab.label}</span>
                <span className="pill-value">{value}</span>
              </button>
            );
          })}
        </section>

        {ok && <div className="alert success">{ok}</div>}
        {error && <div className="alert danger">{error}</div>}

        {loading ? (
          <div className="mis-loader">Cargando prestamos...</div>
        ) : (
          <section className="prestamos-grid">
            {prestamosFiltrados.length === 0 && (
              <div className="empty-state">
                <p className="eyebrow">Sin registros</p>
                <p className="muted">
                  No hay prestamos en el estado seleccionado. Intenta con otro filtro o solicita un nuevo prestamo.
                </p>
                {onSolicitar && (
                  <button className="primary" type="button" onClick={onSolicitar}>
                    Solicitar prestamo
                  </button>
                )}
              </div>
            )}

            {prestamosFiltrados.map((prestamo) => {
              const puedePagarEste = puedePagar(prestamo);
              return (
                <article key={prestamo.id} className="prestamo-card">
                  <header className="prestamo-head">
                    <div>
                      <p className="eyebrow">{prestamo.tipo?.nombre || "Prestamo"}</p>
                      <h3>{currency.format(toNumber(prestamo.monto))}</h3>
                      {prestamo.descripcion && <p className="muted small">{prestamo.descripcion}</p>}
                    </div>
                    <span className={`estado ${estadoTonos[prestamo.estado] ?? "muted"}`}>
                      {estadoLabels[prestamo.estado] ?? prestamo.estado}
                    </span>
                  </header>

                  <div className="prestamo-meta">
                    <div>
                      <p className="meta-label">Cuota mensual</p>
                      <p className="meta-value">
                        {prestamo.cuota_mensual ? currency.format(toNumber(prestamo.cuota_mensual)) : "No aplica"}
                      </p>
                    </div>
                    <div>
                      <p className="meta-label">Plazo</p>
                      <p className="meta-value">
                        {prestamo.plazo_meses ? `${prestamo.plazo_meses} meses` : "No aplica"}
                      </p>
                    </div>
                    <div>
                      <p className="meta-label">Pagado</p>
                      <p className="meta-value">{currency.format(toNumber(prestamo.total_pagado))}</p>
                    </div>
                    <div>
                      <p className="meta-label">Saldo pendiente</p>
                      <p className="meta-value accent">
                        {currency.format(toNumber(prestamo.saldo_pendiente || prestamo.monto))}
                      </p>
                    </div>
                  </div>

                  <footer className="prestamo-footer">
                    <div className="fechas">
                      <span>Solicitado: {prestamo.fecha_solicitud ? String(prestamo.fecha_solicitud).slice(0, 10) : "N/D"}</span>
                      <span>
                        Desembolso: {prestamo.fecha_desembolso ? String(prestamo.fecha_desembolso).slice(0, 10) : "Pendiente"}
                      </span>
                    </div>
                    {puedePagarEste ? (
                      <button type="button" className="primary" onClick={() => abrirPasarela(prestamo)}>
                        Pagar cuotas
                      </button>
                    ) : (
                      <span className="muted small">
                        {prestamo.estado === "pendiente"
                          ? "Esperando aprobacion"
                          : prestamo.estado === "rechazado"
                          ? "Solicitud rechazada"
                          : prestamo.estado === "aprobado"
                          ? "Aprobado, en espera de desembolso"
                          : "Sin acciones disponibles"}
                      </span>
                    )}
                  </footer>
                </article>
              );
            })}
          </section>
        )}
      </main>

      {pago && prestamoParaPago && (
        <div className="pago-panel">
          <div className="pago-card">
            <div className="pago-head">
              <div>
                <p className="eyebrow">Pasarela simulada</p>
                <h4>Pagar cuotas</h4>
                <p className="muted small">
                  Elige cuantas cuotas quieres pagar ahora. Este pago es simulado para pruebas.
                </p>
              </div>
              <button type="button" className="ghost" onClick={cerrarPasarela}>
                Cerrar
              </button>
            </div>

            <div className="pago-resumen">
              <div>
                <p className="meta-label">Prestamo</p>
                <p className="meta-value">{currency.format(toNumber(prestamoParaPago.monto))}</p>
              </div>
              <div>
                <p className="meta-label">Saldo actual</p>
                <p className="meta-value accent">{currency.format(toNumber(prestamoParaPago.saldo_pendiente || prestamoParaPago.monto))}</p>
              </div>
              <div>
                <p className="meta-label">Cuota mensual</p>
                <p className="meta-value">
                  {prestamoParaPago.cuota_mensual ? currency.format(toNumber(prestamoParaPago.cuota_mensual)) : "No aplica"}
                </p>
              </div>
              <div>
                <p className="meta-label">Cuotas restantes</p>
                <p className="meta-value">{prestamoParaPago.cuotas_restantes ?? maxCuotas}</p>
              </div>
            </div>

            <label htmlFor="cuotas">Cuantas cuotas quieres pagar ahora?</label>
            <input
              id="cuotas"
              type="number"
              min={1}
              max={maxCuotas}
              value={pago.cuotas}
              onChange={(e) => {
                const next = Number(e.target.value);
                const seguro = Number.isFinite(next) ? Math.min(Math.max(next, 1), maxCuotas) : pago.cuotas;
                setPago({ ...pago, cuotas: seguro });
              }}
            />

            <label htmlFor="metodo">Metodo de pago</label>
            <select
              id="metodo"
              value={pago.metodo}
              onChange={(e) => setPago({ ...pago, metodo: e.target.value })}
            >
              <option value="tarjeta">Tarjeta</option>
              <option value="pse">PSE</option>
              <option value="efectivo">Efectivo</option>
            </select>

            {totalPago && (
              <div className="pago-detalle">
                <p>
                  Pagaras <strong>{pago.cuotas}</strong> cuota(s) por un total de{" "}
                  <strong>{currency.format(totalPago.total)}</strong>.
                </p>
                <p className="muted small">Saldo estimado luego del pago: {currency.format(totalPago.saldoProyectado)}</p>
              </div>
            )}

            <button type="button" className="primary" disabled={procesandoPago} onClick={pagar}>
              {procesandoPago ? "Procesando..." : "Confirmar pago simulado"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
