import { useEffect, useMemo, useState } from "react";
import "../styles/MisPrestamos.css";
import { api } from "../api";
import soloLogo from "../assets/solo-logo-cooprestamos-vector.svg";

type PrestamoCliente = {
  id: string;
  solicitud_id?: string;
  estado: string;
  monto: string;
  cuota_mensual?: string | null;
  plazo_meses?: number | null;
  tipo?: { id?: string | null; nombre?: string | null } | null;
  descripcion?: string;
  fecha_solicitud?: string | null;
  fecha_desembolso?: string | null;
  fecha_vencimiento?: string | null;
  total_pagado?: string;
  saldo_pendiente?: string;
  pagos_registrados?: number;
  cuotas_restantes?: number;
  tiene_desembolso?: boolean;
  puede_pagar?: boolean;
};

type ResumenPrestamos = {
  pendientes: number;
  aprobados: number;
  rechazados: number;
  desembolsados: number;
  pagados: number;
};

type PagoSeleccion = {
  prestamoId: string;
  cuotas: number;
  metodo: string;
};

type MisPrestamosProps = {
  onVolver?: () => void;
  onSolicitar?: () => void;
  usuario?: any;
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

const badgeClass: Record<string, string> = {
  pendiente: "muted",
  aprobado: "info",
  rechazado: "danger",
  desembolsado: "success",
  pagado: "ghost",
  moroso: "warning",
  cancelado: "muted",
};

export default function MisPrestamos({ onVolver, onSolicitar, usuario }: MisPrestamosProps) {
  const [prestamos, setPrestamos] = useState<PrestamoCliente[]>([]);
  const [resumen, setResumen] = useState<ResumenPrestamos | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [pago, setPago] = useState<PagoSeleccion | null>(null);
  const [enviandoPago, setEnviandoPago] = useState(false);

  const prestamoParaPago = useMemo(
    () => prestamos.find((p) => p.id === pago?.prestamoId),
    [prestamos, pago?.prestamoId]
  );
  const maxCuotas = useMemo(() => {
    if (prestamoParaPago?.cuotas_restantes && prestamoParaPago.cuotas_restantes > 0) {
      return Math.max(prestamoParaPago.cuotas_restantes, 1);
    }
    return 12;
  }, [prestamoParaPago]);

  const cargar = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("prestamos/mis");
      const listado = Array.isArray(data?.prestamos) ? data.prestamos : [];
      setPrestamos(
        listado.map((p: PrestamoCliente) => ({
          ...p,
          estado: (p.estado ?? "").toLowerCase(),
        }))
      );
      setResumen(data?.resumen ?? null);
    } catch (err) {
      console.error("No se pudo cargar mis prestamos", err);
      setError("No pudimos cargar tus prestamos. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void cargar();
  }, []);

  const totales = useMemo(() => {
    const base = resumen ?? { pendientes: 0, aprobados: 0, rechazados: 0, desembolsados: 0, pagados: 0 };
    return [
      { label: "Pendientes", value: base.pendientes, tone: "muted" },
      { label: "Aprobados", value: base.aprobados, tone: "info" },
      { label: "Desembolsados", value: base.desembolsados, tone: "success" },
      { label: "Pagados", value: base.pagados, tone: "ghost" },
      { label: "Rechazados", value: base.rechazados, tone: "danger" },
    ];
  }, [resumen]);

  const seleccionarPago = (prestamo: PrestamoCliente) => {
    if (!prestamo.puede_pagar) return;
    const restantes = prestamo.cuotas_restantes ?? 12;
    const cuotasDefault = restantes > 0 ? Math.min(restantes, 12) : 1;
    setPago({
      prestamoId: prestamo.id,
      cuotas: cuotasDefault,
      metodo: "tarjeta",
    });
    setMensaje("");
    setError("");
  };

  const cerrarPago = () => setPago(null);

  const handlePagar = async () => {
    if (!pago) return;
    setEnviandoPago(true);
    setMensaje("");
    setError("");
    try {
      const { data } = await api.post(`prestamos/${pago.prestamoId}/pago-simulado`, {
        cuotas: pago.cuotas,
        metodo: pago.metodo,
      });
      setPrestamos((prev) =>
        prev.map((p) => {
          if (p.id !== pago.prestamoId) return p;
          const estadoNuevo = (data?.prestamo?.estado ?? p.estado)?.toLowerCase() ?? p.estado;
          const saldoRestante = Number(data?.prestamo?.saldo_pendiente ?? p.saldo_pendiente ?? 0);
          const cuota = Number(p.cuota_mensual ?? 0);
          const nuevasCuotas = cuota > 0 ? Math.max(0, Math.ceil(saldoRestante / cuota)) : p.cuotas_restantes;
          return {
            ...p,
            estado: estadoNuevo,
            total_pagado: data?.prestamo?.total_pagado ?? p.total_pagado,
            saldo_pendiente: data?.prestamo?.saldo_pendiente ?? p.saldo_pendiente,
            cuotas_restantes: nuevasCuotas ?? p.cuotas_restantes,
            puede_pagar: saldoRestante > 0,
          };
        })
      );
      setMensaje("Pago simulado registrado correctamente.");
      setPago(null);
      void cargar();
    } catch (err: any) {
      console.error("No se pudo registrar pago", err);
      const detail = err?.response?.data?.detail || err?.response?.data?.cuotas || "No pudimos procesar el pago.";
      setError(typeof detail === "string" ? detail : "No pudimos procesar el pago.");
    } finally {
      setEnviandoPago(false);
    }
  };

  return (
    <div className="mis-shell">
      <header className="mis-topbar">
        <div className="mis-brand">
          <img src={soloLogo} alt="Cooprestamos" />
          <div>
            <p className="eyebrow">COOPRESTAMOS</p>
            <h1>Mis prestamos</h1>
          </div>
        </div>
        <div className="mis-actions">
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
        {usuario?.email && <p className="mis-user">Sesión: {usuario.email}</p>}

        <div className="resumen-grid">
          {totales.map((item) => (
            <div key={item.label} className={`resumen-card tone-${item.tone}`}>
              <p className="resumen-label">{item.label}</p>
              <p className="resumen-value">{item.value}</p>
            </div>
          ))}
        </div>

        {mensaje && <div className="alert success">{mensaje}</div>}
        {error && <div className="alert danger">{error}</div>}

        {loading ? (
          <div className="mis-loader">Cargando mis prestamos...</div>
        ) : (
          <section className="prestamos-grid">
            {prestamos.length === 0 && <p className="muted">Aún no tienes solicitudes o préstamos registrados.</p>}
            {prestamos.map((prestamo) => (
              <article key={prestamo.id} className="prestamo-card">
                <header className="prestamo-head">
                  <div>
                    <p className="eyebrow">{prestamo.tipo?.nombre || "Préstamo"}</p>
                    <h3>{currency.format(Number(prestamo.monto || 0))}</h3>
                    {prestamo.descripcion && <p className="muted small">{prestamo.descripcion}</p>}
                  </div>
                  <span className={`estado ${badgeClass[prestamo.estado] ?? "muted"}`}>
                    {estadoLabels[prestamo.estado] ?? prestamo.estado}
                  </span>
                </header>
                <dl className="prestamo-meta">
                  <div>
                    <dt>Cuota mensual</dt>
                    <dd>{prestamo.cuota_mensual ? currency.format(Number(prestamo.cuota_mensual)) : "—"}</dd>
                  </div>
                  <div>
                    <dt>Plazo</dt>
                    <dd>{prestamo.plazo_meses ? `${prestamo.plazo_meses} meses` : "—"}</dd>
                  </div>
                  <div>
                    <dt>Pagado</dt>
                    <dd>{currency.format(Number(prestamo.total_pagado || 0))}</dd>
                  </div>
                  <div>
                    <dt>Saldo</dt>
                    <dd className="accent">{currency.format(Number(prestamo.saldo_pendiente || prestamo.monto || 0))}</dd>
                  </div>
                </dl>
                <footer className="prestamo-footer">
                  <div className="fechas">
                    <span>Solicitado: {prestamo.fecha_solicitud ? String(prestamo.fecha_solicitud).slice(0, 10) : "—"}</span>
                    <span>Desembolso: {prestamo.fecha_desembolso ? String(prestamo.fecha_desembolso).slice(0, 10) : "—"}</span>
                  </div>
                  {prestamo.puede_pagar ? (
                    <button type="button" onClick={() => seleccionarPago(prestamo)}>
                      Pagar cuotas
                    </button>
                  ) : (
                    <span className="muted small">
                      {prestamo.estado === "pendiente"
                        ? "Esperando aprobación"
                        : prestamo.estado === "rechazado"
                        ? "Solicitud rechazada"
                        : "Sin acciones disponibles"}
                    </span>
                  )}
                </footer>
              </article>
            ))}
          </section>
        )}
      </main>

      {pago && (
        <div className="pago-panel">
          <div className="pago-card">
            <div className="pago-head">
              <h4>Pasarela simulada</h4>
              <button type="button" className="ghost" onClick={cerrarPago}>
                Cerrar
              </button>
            </div>
            <label htmlFor="cuotas">¿Cuántas cuotas quieres pagar ahora?</label>
            <input
              id="cuotas"
              type="number"
              min={1}
              max={maxCuotas}
              value={pago.cuotas}
              onChange={(e) => {
                const val = Number(e.target.value);
                const safe = Number.isFinite(val) ? Math.min(Math.max(val, 1), maxCuotas) : pago.cuotas;
                setPago({ ...pago, cuotas: safe });
              }}
            />
            <label htmlFor="metodo">Método</label>
            <select
              id="metodo"
              value={pago.metodo}
              onChange={(e) => setPago({ ...pago, metodo: e.target.value })}
            >
              <option value="tarjeta">Tarjeta</option>
              <option value="pse">PSE</option>
              <option value="efectivo">Efectivo</option>
            </select>
            <button type="button" disabled={enviandoPago} onClick={handlePagar}>
              {enviandoPago ? "Procesando..." : "Pagar ahora"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
