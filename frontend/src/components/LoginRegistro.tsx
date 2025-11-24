import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import "../styles/autenticacion.css";
import logo from "../assets/logo-cooprestamos-vector.svg";
import { api } from "../api";

type ModoVista = "iniciar" | "registrar";

export default function LoginRegistro() {
  const [modoVista, setModoVista] = useState<ModoVista>("iniciar");

  const [correo, setCorreo] = useState<string>("");
  const [contrasena, setContrasena] = useState<string>("");
  const [nombreCompleto, setNombreCompleto] = useState<string>("");

  const contenedorClase = useMemo(
    () => `container ${modoVista === "registrar" ? "active" : ""}`,
    [modoVista]
  );

  const manejarEnvioInicioSesion = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const response = await api.post("auth/login/", {
        email: correo,
        password: contrasena,
      });
      
      console.log("Login exitoso:", response.data);
      
      // Recargar la página para actualizar el estado de autenticación
      window.location.reload();
    } catch (err: any) {
      const errorMsg = err?.response?.data?.error || "Error al iniciar sesión";
      alert(errorMsg);
    }
  };

  const manejarEnvioRegistro = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      // Registrar usuario (esto crea automáticamente el socio)
      const response = await api.post("auth/registro/", {
        email: correo,
        password: contrasena,
        nombres: nombreCompleto,
      });
      
      console.log("Registro exitoso:", response.data);
      alert("¡Registro exitoso! Ahora puedes iniciar sesión.");
      
      // Cambiar a vista de login
      setModoVista("iniciar");
      setCorreo(correo); // Mantener el email para facilitar el login
    } catch (err: any) {
      const errorMsg = err?.response?.data?.error || "Error al registrar usuario";
      alert(errorMsg);
    }
  };

  return (
    <div className={contenedorClase} id="contenedorAutenticacion">
      {/* Panel de Registro */}
      <div className="form-container sign-up">
        <form onSubmit={manejarEnvioRegistro} aria-label="Formulario de registro">
          <img src={logo} alt="Coop Préstamos" className="form-title-logo" />

          <div className="social-icons" aria-label="Ingresar con redes">
            <a href="#" className="icon" aria-label="Google">
              <i className="fa-brands fa-google-plus-g" />
            </a>
            <a href="#" className="icon" aria-label="Facebook">
              <i className="fa-brands fa-facebook-f" />
            </a>
            <a href="#" className="icon" aria-label="GitHub">
              <i className="fa-brands fa-github" />
            </a>
            <a href="#" className="icon" aria-label="LinkedIn">
              <i className="fa-brands fa-linkedin-in" />
            </a>
          </div>

          <span>o usa tu correo para registrarte</span>

          <input
            type="text"
            placeholder="Nombre completo"
            name="nombreCompleto"
            value={nombreCompleto}
            onChange={(e) => setNombreCompleto(e.target.value)}
            required
            autoComplete="name"
          />
          <input
            type="email"
            placeholder="Correo electrónico"
            name="correo"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            required
            autoComplete="email"
          />
          <input
            type="password"
            placeholder="Contraseña"
            name="contrasena"
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
            required
            autoComplete="new-password"
            minLength={6}
          />

          <button type="submit">Registrarme</button>
        </form>
      </div>

      {/* Panel de Inicio de Sesión */}
      <div className="form-container sign-in">
        <form onSubmit={manejarEnvioInicioSesion} aria-label="Formulario de inicio de sesión">
          <img src={logo} alt="Coop Préstamos" className="form-title-logo" />

          <div className="social-icons" aria-label="Ingresar con redes">
            <a href="#" className="icon" aria-label="Google">
              <i className="fa-brands fa-google-plus-g" />
            </a>
            <a href="#" className="icon" aria-label="Facebook">
              <i className="fa-brands fa-facebook-f" />
            </a>
            <a href="#" className="icon" aria-label="GitHub">
              <i className="fa-brands fa-github" />
            </a>
            <a href="#" className="icon" aria-label="LinkedIn">
              <i className="fa-brands fa-linkedin-in" />
            </a>
          </div>

          <span>o usa tu correo y contraseña</span>

          <input
            type="email"
            placeholder="Correo electrónico"
            name="correo"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            required
            autoComplete="email"
          />
          <input
            type="password"
            placeholder="Contraseña"
            name="contrasena"
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
            required
            autoComplete="current-password"
            minLength={6}
          />

          <a href="#">¿Olvidaste tu contraseña?</a>
          <button type="submit">Ingresar</button>
        </form>
      </div>

      {/* Toggle / Mensajes laterales */}
      <div className="toggle-container" aria-hidden={true}>
        <div className="toggle">
          <div className="toggle-panel toggle-left">
            <h1>¡Bienvenido de nuevo!</h1>
            <p>Ingresa tus datos personales para usar todas las funciones.</p>
            <button
              className="hidden"
              id="btnIrIniciar"
              type="button"
              onClick={() => setModoVista("iniciar")}
              aria-label="Ir a iniciar sesión"
            >
              Iniciar sesión
            </button>
          </div>
          <div className="toggle-panel toggle-right">
            <h1>¡Hola!</h1>
            <p>Regístrate con tus datos personales para empezar a ser parte de la familia COOPRESTAMOS.</p>
            <button
              className="hidden"
              id="btnIrRegistrar"
              type="button"
              onClick={() => setModoVista("registrar")}
              aria-label="Ir a registrarme"
            >
              Crear cuenta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

