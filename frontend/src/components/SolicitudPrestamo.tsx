import { useEffect, useMemo, useState } from "react";
import "../styles/SolicitudPrestamo.css";
import { api } from "../api";
import logo from "../assets/logo-cooprestamos-vector.svg";

type TipoPrestamoDto = {
  id: string;
  nombre: string;
  descripcion?: string;
  tasa_interes_anual: string | number;
  plazo_meses: number;
};

type CuotaPlan = {
  numero: number;
  cuota: string;
  capital: string;
  interes: string;
  saldo: string;
};

type SimulacionResponse = {
  prestamo_id?: string;
  solicitud_id?: string;
  estado?: string;
  fecha_desembolso?: string;
  fecha_vencimiento?: string | null;
  socio: {
    id: string;
    nombre_completo: string;
    documento?: string;
    email?: string | null;
  };
  tipo: TipoPrestamoDto;
  monto: string;
  plazo_meses: number;
  cuota_mensual: string;
  total_a_pagar: string;
  total_intereses: string;
  cuotas: CuotaPlan[];
};

type SolicitudPrestamoProps = {
  onVolver?: () => void;
  usuario?: any;
};

const currency = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export default function SolicitudPrestamo({ onVolver, usuario }: SolicitudPrestamoProps) {
  const [socio, setSocio] = useState<any>(null);
  const [tipos, setTipos] = useState<TipoPrestamoDto[]>([]);
  const [tipoSeleccionado, setTipoSeleccionado] = useState<string>("");
  const [monto, setMonto] = useState<string>("5000000");
  const [descripcion, setDescripcion] = useState<string>("");
  const [simulacion, setSimulacion] = useState<SimulacionResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [calculando, setCalculando] = useState<boolean>(false);
  const [enviando, setEnviando] = useState<boolean>(false);
  const [mensaje, setMensaje] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [plazoSeleccionado, setPlazoSeleccionado] = useState<number | null>(null);

  useEffect(() => {
    const cargar = async () => {
      setLoading(true);
      try {
        const [socioResp, tiposResp] = await Promise.all([
          api.get("auth/me"),
          api.get("tipos-prestamo/activos"),
        ]);
        setSocio(socioResp.data);
        const disponibles = Array.isArray(tiposResp.data) ? tiposResp.data : [];
        setTipos(disponibles);
        if (disponibles.length > 0) {
          setTipoSeleccionado(disponibles[0].id);
          setPlazoSeleccionado(disponibles[0].plazo_meses ?? null);
        }
      } catch (err) {
        console.error("No se pudo cargar solicitud de prestamo", err);
        setError("No pudimos cargar los datos. Intenta nuevamente.");
      } finally {
        setLoading(false);
      }
    };
    void cargar();
  }, []);

  const tipoActual = useMemo(
    () => tipos.find((t) => t.id === tipoSeleccionado),
    [tipos, tipoSeleccionado]
  );

  const opcionesPlazo = useMemo(() => {
    const max = tipoActual?.plazo_meses ?? 0;
    if (!max || max < 6) return [];
    const arr: number[] = [];
    for (let m = 6; m <= max; m += 6) {
      arr.push(m);
    }
    return arr;
  }, [tipoActual]);

  const handleSimular = async () => {
    setError("");
    setMensaje("");
    const montoNumerico = Number(monto);
    if (!tipoSeleccionado) {
      setError("Selecciona un tipo de prestamo.");
      return;
    }
    if (!Number.isFinite(montoNumerico) || montoNumerico <= 0) {
      setError("Ingresa un monto valido.");
      return;
    }

    setCalculando(true);
    try {
      const { data } = await api.post<SimulacionResponse>("prestamos/simular", {
        tipo_prestamo_id: tipoSeleccionado,
        monto: montoNumerico,
        plazo_meses: plazoSeleccionado ?? tipoActual?.plazo_meses,
      });
      setSimulacion(data);
    } catch (err: any) {
      console.error("Error al simular prestamo", err);
      const detail = err?.response?.data?.detail || "No pudimos simular el prestamo.";
      setError(detail);
    } finally {
      setCalculando(false);
    }
  };

  useEffect(() => {
    if (!loading && tipoSeleccionado && monto) {
      void handleSimular();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipoSeleccionado]);

  const handleSolicitar = async () => {
    setError("");
    setMensaje("");
    const montoNumerico = Number(monto);
    if (!Number.isFinite(montoNumerico) || montoNumerico <= 0) {
      setError("Ingresa un monto valido.");
      return;
    }
    if (!tipoSeleccionado) {
      setError("Selecciona un tipo de prestamo.");
      return;
    }

    setEnviando(true);
    try {
      const { data } = await api.post<SimulacionResponse>("prestamos/solicitudes", {
        tipo_prestamo_id: tipoSeleccionado,
        monto: montoNumerico,
        plazo_meses: plazoSeleccionado ?? tipoActual?.plazo_meses,
        descripcion: descripcion || undefined,
      });
      setSimulacion(data);
      const ref = data.solicitud_id || data.prestamo_id;
      setMensaje(
        `Solicitud registrada. Te notificaremos cuando sea revisada.${ref ? ` Ref: ${ref}` : ""}`
      );
    } catch (err: any) {
      console.error("Error al registrar solicitud", err);
      const detail = err?.response?.data?.detail || "No pudimos registrar la solicitud.";
      setError(detail);
    } finally {
      setEnviando(false);
    }
  };

  if (loading) {
    return (
      <div className="solicitud-shell">
        <div className="solicitud-loader" role="status">
          <img src={logo} alt="Cooprestamos" />
          <p>Cargando modulo de solicitud...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="solicitud-shell">
      <header className="solicitud-header">
        <div className="solicitud-brand">
          <img src={logo} alt="Cooprestamos" />
          <div>
            <p className="eyebrow">Solicitud de prestamo</p>
            <h1>Hola {usuario?.nombres ?? socio?.nombre_completo ?? "socio"}</h1>
            <p className="muted">
              Completa el monto, elige el tipo de prestamo y revisa tu plan de cuotas antes de enviarlo.
            </p>
          </div>
        </div>
        <div className="solicitud-actions">
          {onVolver && (
            <button className="ghost" type="button" onClick={onVolver}>
              Volver a la landing
            </button>
          )}
        </div>
      </header>

      <main className="solicitud-grid">
        <section className="solicitud-card">
          <div className="section-heading">
            <h2>Tu solicitud</h2>
            <p className="muted">
              Usa tus datos cargados del registro y confirma el monto que necesitas.
            </p>
          </div>

          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="monto">Monto solicitado</label>
              <div className="input-with-badge">
                <span className="input-prefix">COP</span>
                <input
                  id="monto"
                  type="number"
                  min={0}
                  step={500000}
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  placeholder="0"
                />
              </div>
              <small className="muted">Ingresa el monto total que necesitas financiar.</small>
            </div>

          <div className="form-field">
            <label htmlFor="tipo">Tipo de prestamo</label>
            <select
              id="tipo"
              value={tipoSeleccionado}
              onChange={(e) => {
                setTipoSeleccionado(e.target.value);
                const nuevo = tipos.find((t) => t.id === e.target.value);
                setPlazoSeleccionado(nuevo?.plazo_meses ?? null);
              }}
            >
              {tipos.map((tipo) => (
                <option key={tipo.id} value={tipo.id}>
                  {tipo.nombre} - {Number(tipo.tasa_interes_anual).toFixed(2)}% anual - {tipo.plazo_meses}m
                </option>
              ))}
            </select>
            {tipoActual?.descripcion && <small className="muted">{tipoActual.descripcion}</small>}
          </div>
          {opcionesPlazo.length > 0 && (
            <div className="form-field">
              <label htmlFor="plazo">Plazo en meses</label>
              <select
                id="plazo"
                value={plazoSeleccionado ?? tipoActual?.plazo_meses ?? ""}
                onChange={(e) => setPlazoSeleccionado(Number(e.target.value))}
              >
                {opcionesPlazo.map((m) => (
                  <option key={m} value={m}>
                    {m} meses
                  </option>
                ))}
              </select>
              <small className="muted">Elige en saltos de 6 meses hasta {tipoActual?.plazo_meses}.</small>
            </div>
          )}
        </div>

          <div className="form-field">
            <label htmlFor="descripcion">Descripcion (opcional)</label>
            <textarea
              id="descripcion"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Para invertir en mi negocio, reformar vivienda, etc."
              rows={3}
            />
          </div>

          <div className="cta-row">
            <button type="button" className="ghost" onClick={handleSimular} disabled={calculando}>
              {calculando ? "Calculando..." : "Calcular cuotas"}
            </button>
            <button type="button" onClick={handleSolicitar} disabled={enviando || calculando}>
              {enviando ? "Enviando..." : "Enviar solicitud"}
            </button>
          </div>

          {mensaje && <div className="alert success">{mensaje}</div>}
          {error && <div className="alert danger">{error}</div>}
        </section>

        <section className="solicitud-card">
          <div className="section-heading">
            <h2>Resumen</h2>
            <p className="muted">Mira el valor de la cuota, intereses y total a pagar segun el tipo elegido.</p>
          </div>

          <div className="summary-grid">
            <article className="summary-card">
              <p className="summary-label">Monto</p>
              <p className="summary-value accent">{currency.format(Number(simulacion?.monto ?? (monto || 0)))}</p>
              <p className="summary-meta">Solicitado por el socio</p>
            </article>
            <article className="summary-card strong">
              <p className="summary-label">Cuota mensual</p>
              <p className="summary-value">
                {simulacion ? currency.format(Number(simulacion.cuota_mensual)) : "--"}
              </p>
              <p className="summary-meta">
                Plazo: {simulacion?.plazo_meses ?? plazoSeleccionado ?? tipoActual?.plazo_meses ?? 0} meses
              </p>
            </article>
            <article className="summary-card warning">
              <p className="summary-label">Intereses estimados</p>
              <p className="summary-value">{simulacion ? currency.format(Number(simulacion.total_intereses)) : "--"}</p>
              <p className="summary-meta">
                Tasa anual: {tipoActual ? Number(tipoActual.tasa_interes_anual).toFixed(2) : "--"}%
              </p>
            </article>
            <article className="summary-card success">
              <p className="summary-label">Total a pagar</p>
              <p className="summary-value accent">
                {simulacion ? currency.format(Number(simulacion.total_a_pagar)) : "--"}
              </p>
              <p className="summary-meta">Incluye capital + intereses</p>
            </article>
          </div>

          <div className="plan-wrapper">
            <div className="plan-header">
              <div>
                <p className="summary-label">Plan de cuotas</p>
                <h3>{simulacion?.cuotas?.length ?? plazoSeleccionado ?? tipoActual?.plazo_meses ?? 0} cuotas</h3>
              </div>
              <div className="pill">
                {tipoActual ? `${Number(tipoActual.tasa_interes_anual).toFixed(2)}% anual` : "--"}
              </div>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Cuota</th>
                    <th>Capital</th>
                    <th>Interes</th>
                    <th>Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {simulacion?.cuotas?.map((c) => (
                    <tr key={c.numero}>
                      <td>{c.numero}</td>
                      <td className="align-right">{currency.format(Number(c.cuota))}</td>
                      <td className="align-right">{currency.format(Number(c.capital))}</td>
                      <td className="align-right">{currency.format(Number(c.interes))}</td>
                      <td className="align-right">{currency.format(Number(c.saldo))}</td>
                    </tr>
                  ))}
                  {!simulacion?.cuotas?.length && (
                    <tr>
                      <td colSpan={5} className="muted">
                        Calcula para ver el detalle de cuotas.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <aside className="solicitud-card sticky">
          <div className="section-heading">
            <h2>Datos del socio</h2>
            <p className="muted">Informacion precargada desde tu registro.</p>
          </div>
          <div className="info-row">
            <span className="label">Nombre</span>
            <span className="value">{socio?.nombre_completo ?? usuario?.nombres ?? "-"}</span>
          </div>
          <div className="info-row">
            <span className="label">Documento</span>
            <span className="value">{socio?.documento ?? "No cargado"}</span>
          </div>
          <div className="info-row">
            <span className="label">Telefono</span>
            <span className="value">{socio?.telefono ?? "No cargado"}</span>
          </div>
          <div className="info-row">
            <span className="label">Direccion</span>
            <span className="value">{socio?.direccion ?? "No cargada"}</span>
          </div>
          <hr />
          <div className="info-row">
            <span className="label">Tipo elegido</span>
            <span className="value">{tipoActual?.nombre ?? "--"}</span>
          </div>
          <div className="info-row">
            <span className="label">Plazo</span>
            <span className="value">{tipoActual?.plazo_meses ?? 0} meses</span>
          </div>
          <div className="info-row">
            <span className="label">Tasa</span>
            <span className="value">
              {tipoActual ? `${Number(tipoActual.tasa_interes_anual).toFixed(2)}%` : "--"}
            </span>
          </div>
        </aside>
      </main>
    </div>
  );
}
