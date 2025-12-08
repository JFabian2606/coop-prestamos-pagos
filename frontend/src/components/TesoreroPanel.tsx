import { useEffect, useState } from "react";
import { api } from "../api";
import logo from "../assets/solo-logo-cooprestamos-vector.svg";

type Desembolso = {
  id: string;
  prestamo_id: string;
  monto: string;
  metodo_pago: string;
  referencia?: string;
  comentarios?: string;
  created_at: string;
  socio?: {
    id?: string;
    nombre_completo?: string;
    documento?: string;
    email?: string;
  } | null;
};

const METODOS = [
  { value: "transferencia", label: "Transferencia" },
  { value: "efectivo", label: "Efectivo" },
  { value: "cheque", label: "Cheque" },
];

type Props = {
  usuario: any;
  onLogout: () => void;
};

export default function TesoreroPanel({ usuario, onLogout }: Props) {
  const [desembolsos, setDesembolsos] = useState<Desembolso[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [form, setForm] = useState({
    prestamo_id: "",
    monto: "",
    metodo_pago: "transferencia",
    referencia: "",
    comentarios: "",
  });

  const fetchListado = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("desembolsos/");
      setDesembolsos(data?.results ?? []);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "No se pudieron cargar los desembolsos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchListado();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setOk("");
    try {
      const payload = {
        prestamo_id: form.prestamo_id.trim(),
        monto: form.monto,
        metodo_pago: form.metodo_pago,
        referencia: form.referencia || undefined,
        comentarios: form.comentarios || undefined,
      };
      const { data } = await api.post("desembolsos/", payload);
      setOk("Desembolso registrado.");
      setForm((prev) => ({ ...prev, referencia: "", comentarios: "" }));
      setDesembolsos((prev) => [data, ...prev]);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? JSON.stringify(err?.response?.data ?? "Error al registrar"));
    } finally {
      setLoading(false);
    }
  };

  const nombreParaMostrar = usuario?.nombre ?? usuario?.email ?? "Tesorero";

  return (
    <div className="admin-shell">
      <header className="topbar">
        <div className="brand">
          <img src={logo} alt="Cooprestamos logo" />
          <div>
            <p className="brand__eyebrow">Panel Tesorero</p>
            <p className="brand__name">Cooprestamos</p>
          </div>
        </div>
        <div className="topbar__right">
          <div className="user-chip" aria-label={`Sesion iniciada como ${nombreParaMostrar}`}>
            <div className="user-chip__avatar">
              <img src={logo} alt="Avatar tesorero" />
            </div>
            <div>
              <p className="user-chip__label">Tesorero</p>
              <p className="user-chip__name">{nombreParaMostrar}</p>
            </div>
          </div>
          <button className="danger" onClick={onLogout}>
            Cerrar sesion
          </button>
        </div>
      </header>

      <main className="admin-container">
        <div className="page-header">
          <div>
            <p className="eyebrow">Caja</p>
            <h1>Registrar desembolsos</h1>
            <p className="subtitle">Solo rol Tesorero. Valida préstamo aprobado/activo y guarda comprobante.</p>
          </div>
        </div>

        <section className="tesorero-grid">
          <div className="tesorero-card">
            <h3>Nuevo desembolso</h3>
            <form className="tesorero-form" onSubmit={handleSubmit}>
              <label>
                <span>ID de préstamo</span>
                <input
                  type="text"
                  value={form.prestamo_id}
                  onChange={(e) => setForm((prev) => ({ ...prev, prestamo_id: e.target.value }))}
                  required
                />
              </label>
              <label>
                <span>Monto</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.monto}
                  onChange={(e) => setForm((prev) => ({ ...prev, monto: e.target.value }))}
                  required
                />
              </label>
              <label>
                <span>Método de pago</span>
                <select
                  value={form.metodo_pago}
                  onChange={(e) => setForm((prev) => ({ ...prev, metodo_pago: e.target.value }))}
                >
                  {METODOS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Referencia</span>
                <input
                  type="text"
                  value={form.referencia}
                  onChange={(e) => setForm((prev) => ({ ...prev, referencia: e.target.value }))}
                  placeholder="# de transferencia, cheque, etc."
                />
              </label>
              <label>
                <span>Comentarios</span>
                <textarea
                  rows={3}
                  value={form.comentarios}
                  onChange={(e) => setForm((prev) => ({ ...prev, comentarios: e.target.value }))}
                  placeholder="Opcional"
                />
              </label>
              <div className="tesorero-actions">
                <button className="primary" type="submit" disabled={loading}>
                  {loading ? "Registrando..." : "Registrar desembolso"}
                </button>
              </div>
            </form>
            {error && <div className="alert error">{error}</div>}
            {ok && <div className="alert success">{ok}</div>}
          </div>

          <div className="tesorero-card">
            <h3>Desembolsos recientes</h3>
            {loading && desembolsos.length === 0 && <p className="muted">Cargando...</p>}
            {!loading && desembolsos.length === 0 && <p className="muted">No hay desembolsos registrados.</p>}
            <div className="tesorero-list">
              {desembolsos.map((d) => (
                <article key={d.id} className="tesorero-list__item">
                  <div>
                    <p className="eyebrow">{d.metodo_pago}</p>
                    <h4>{d.monto}</h4>
                    <p className="subtitle">Préstamo: {d.prestamo_id}</p>
                    {d.referencia && <p className="subtitle">Ref: {d.referencia}</p>}
                    {d.comentarios && <p className="subtitle">Nota: {d.comentarios}</p>}
                  </div>
                  {d.socio && (
                    <div className="tesorero-list__meta">
                      <p className="subtitle">{d.socio.nombre_completo}</p>
                      <p className="subtitle">{d.socio.documento}</p>
                      <p className="subtitle">{d.socio.email}</p>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="admin-footer">Cooprestamos - Panel Tesorero - {new Date().getFullYear()}</footer>
    </div>
  );
}
