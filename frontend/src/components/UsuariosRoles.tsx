import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import "../styles/SociosViewer.css";

type Rol = { id: string; nombre: string };

type Usuario = {
  id: string;
  email: string;
  nombres: string;
  rol: Rol | null;
  activo: boolean;
  is_staff: boolean;
  is_superuser: boolean;
};

export default function UsuariosRoles() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [actualizando, setActualizando] = useState<string | null>(null);
  const [filtro, setFiltro] = useState("");

  useEffect(() => {
    const cargar = async () => {
      setLoading(true);
      setError("");
      try {
        const [rolesResp, usuariosResp] = await Promise.all([api.get("auth/roles/"), api.get("auth/usuarios/")]);
        setRoles(rolesResp.data ?? []);
        setUsuarios(usuariosResp.data ?? []);
      } catch (err) {
        console.error("No se pudo cargar usuarios", err);
        setError("No se pudieron cargar los usuarios o roles.");
      } finally {
        setLoading(false);
      }
    };
    void cargar();
  }, []);

  const usuariosFiltrados = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    if (!q) return usuarios;
    return usuarios.filter(
      (u) => u.nombres.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (u.rol?.nombre ?? "").toLowerCase().includes(q)
    );
  }, [usuarios, filtro]);

  const handleCambioRol = async (usuarioId: string, rolId: string) => {
    setError("");
    setMensaje("");
    setActualizando(usuarioId);
    try {
      const { data } = await api.patch(`auth/usuarios/${usuarioId}/rol/`, { rol_id: rolId });
      setUsuarios((prev) => prev.map((u) => (u.id === usuarioId ? { ...u, ...data } : u)));
      setMensaje("Rol actualizado correctamente.");
    } catch (err) {
      console.error("Error al actualizar rol", err);
      setError("No se pudo actualizar el rol.");
    } finally {
      setActualizando(null);
    }
  };

  if (loading) {
    return <p>Cargando usuarios...</p>;
  }

  return (
    <div className="socios-panel">
      <div className="socios-panel__header">
        <div>
          <p className="eyebrow">Usuarios</p>
          <h2>Credenciales y roles</h2>
          <p className="section-description">Asigna rol: socio, cajero, analista o admin.</p>
        </div>
        <div className="socios-panel__actions">
          <div className="search-input">
            <label htmlFor="filtro">Buscar</label>
            <input
              id="filtro"
              type="text"
              placeholder="Nombre, email o rol"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
            />
          </div>
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}
      {mensaje && <div className="alert success">{mensaje}</div>}

      <div className="socios-table">
        <div className="socios-table__head">
          <span>Nombre</span>
          <span>Email</span>
          <span>Rol</span>
          <span>Estado</span>
        </div>
        <div className="socios-table__body">
          {usuariosFiltrados.map((usuario) => (
            <div key={usuario.id} className="socios-row">
              <span>
                <strong>{usuario.nombres}</strong>
                <small>{usuario.email}</small>
              </span>
              <span>{usuario.email}</span>
              <span>
                <div className="estado-control">
                  <select
                    className="estado-pill estado-pill--action"
                    value={usuario.rol?.id ?? ""}
                    onChange={(e) => handleCambioRol(usuario.id, e.target.value)}
                    disabled={actualizando === usuario.id}
                  >
                    <option value="">Sin rol</option>
                    {roles.map((rol) => (
                      <option key={rol.id} value={rol.id}>
                        {rol.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </span>
              <span>
                <span
                  className={`estado-pill estado-pill--static ${
                    usuario.activo ? "estado-pill--activo" : "estado-pill--inactivo"
                  }`}
                >
                  {usuario.activo ? "Activo" : "Inactivo"}
                </span>
              </span>
            </div>
          ))}
          {usuariosFiltrados.length === 0 && <div className="muted">Sin resultados.</div>}
        </div>
      </div>
    </div>
  );
}
