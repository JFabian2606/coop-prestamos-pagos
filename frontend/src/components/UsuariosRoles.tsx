import { useEffect, useState } from "react";
import { api } from "../api";

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
    <div className="historial-panel">
      <div className="historial-header">
        <div>
          <p className="eyebrow">Usuarios</p>
          <h2>Credenciales y roles</h2>
          <p className="section-description">Asigna rol: socio, cajero, analista o admin.</p>
        </div>
      </div>

      {error && <div className="alert danger">{error}</div>}
      {mensaje && <div className="alert success">{mensaje}</div>}

      <div className="table-wrapper" style={{ border: "1px solid var(--border)", borderRadius: "12px" }}>
        <table className="list-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>Rol</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((usuario) => (
              <tr key={usuario.id}>
                <td>{usuario.nombres}</td>
                <td>{usuario.email}</td>
                <td>
                  <select
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
                </td>
                <td>
                  <span className={`status ${usuario.activo ? "success" : "warning"}`}>
                    {usuario.activo ? "activo" : "inactivo"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
