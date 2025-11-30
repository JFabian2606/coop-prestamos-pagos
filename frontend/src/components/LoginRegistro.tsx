import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import "../styles/autenticacion.css";
import logo from "../assets/logo-cooprestamos-vector.svg";
import { api, ensureCsrfCookie } from "../api";

type ModoVista = "iniciar" | "registrar" | "recuperar" | "restablecer";

export default function LoginRegistro() {
  const [modoVista, setModoVista] = useState<ModoVista>("iniciar");

  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [nombreCompleto, setNombreCompleto] = useState("");
  const [documento, setDocumento] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");
  const [correoRecuperacion, setCorreoRecuperacion] = useState("");
  const [recuperacionEnProgreso, setRecuperacionEnProgreso] = useState(false);
  const [recuperacionMensaje, setRecuperacionMensaje] = useState<string | null>(null);
  const [recuperacionError, setRecuperacionError] = useState<string | null>(null);
  const [nuevaContrasena, setNuevaContrasena] = useState("");
  const [confirmarContrasena, setConfirmarContrasena] = useState("");
  const [restablecerMensaje, setRestablecerMensaje] = useState<string | null>(null);
  const [restablecerError, setRestablecerError] = useState<string | null>(null);
  const [restablecerEnProgreso, setRestablecerEnProgreso] = useState(false);
  const [uidToken, setUidToken] = useState<{ uid: string; token: string }>({ uid: "", token: "" });

  const contenedorClase = useMemo(() => {
    const clases = ["container"];
    if (modoVista === "registrar") {
      clases.push("active");
    }
    return clases.join(" ");
  }, [modoVista]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const uid = params.get("uid") ?? "";
    const token = params.get("token") ?? "";
    if (uid && token) {
      setUidToken({ uid, token });
      setModoVista("restablecer");
      return;
    }

    // Soporta enlace con segmentos /reset/<uid>/<token> (ej. enviado por Django)
    const segmentos = window.location.pathname.split("/").filter(Boolean);
    const resetIndex = segmentos.findIndex((parte) => parte === "reset");
    const uidSegment = resetIndex !== -1 ? segmentos[resetIndex + 1] : "";
    const tokenSegment = resetIndex !== -1 ? segmentos[resetIndex + 2] : "";
    if (uidSegment && tokenSegment) {
      setUidToken({ uid: uidSegment, token: tokenSegment });
      setModoVista("restablecer");
    }
  }, []);

  const manejarEnvioInicioSesion = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      await ensureCsrfCookie();
      const response = await api.post("auth/login/", {
        email: correo,
        password: contrasena,
      });
      console.log("Login exitoso:", response.data);
      window.location.reload();
    } catch (err: any) {
      const errorMsg = err?.response?.data?.error || "Error al iniciar sesion";
      alert(errorMsg);
    }
  };

  const manejarEnvioRegistro = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      await ensureCsrfCookie();
      const response = await api.post("auth/registro/", {
        email: correo,
        password: contrasena,
        nombres: nombreCompleto,
        documento,
        telefono,
        direccion,
        fecha_alta: new Date().toISOString().slice(0, 10),
      });
      console.log("Registro exitoso:", response.data);
      alert("Registro exitoso. Ahora puedes iniciar sesion.");
      setModoVista("iniciar");
      setCorreo(correo);
    } catch (err: any) {
      const errorMsg = err?.response?.data?.error || "Error al registrar usuario";
      alert(errorMsg);
    }
  };

  const manejarEnvioRecuperacion = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setRecuperacionMensaje(null);
    setRecuperacionError(null);
    setRecuperacionEnProgreso(true);
    try {
      await ensureCsrfCookie();
      await api.post("auth/password_reset/", {
        email: correoRecuperacion || correo,
      });
      setRecuperacionMensaje("Si el correo existe, se envio un enlace para restablecer la contrasena.");
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.email?.[0] ||
        err?.response?.data?.error ||
        "No pudimos enviar el correo de recuperacion. Intenta mas tarde.";
      setRecuperacionError(errorMsg);
    } finally {
      setRecuperacionEnProgreso(false);
    }
  };

  const manejarEnvioRestablecer = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!uidToken.uid || !uidToken.token) {
      setRestablecerError("El enlace no es valido. Solicita uno nuevo.");
      return;
    }
    setRestablecerMensaje(null);
    setRestablecerError(null);
    setRestablecerEnProgreso(true);
    try {
      await ensureCsrfCookie();
      await api.post(`auth/reset/${uidToken.uid}/${uidToken.token}/`, {
        new_password1: nuevaContrasena,
        new_password2: confirmarContrasena,
      });
      setRestablecerMensaje("Listo. Tu contrasena fue actualizada. Ya puedes iniciar sesion.");
      setNuevaContrasena("");
      setConfirmarContrasena("");
      setUidToken({ uid: "", token: "" });
      window.history.replaceState({}, document.title, window.location.pathname);
      setModoVista("iniciar");
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.new_password2?.[0] ||
        err?.response?.data?.token ||
        err?.response?.data?.error ||
        "No pudimos actualizar la contrasena. Solicita un nuevo enlace.";
      setRestablecerError(errorMsg);
    } finally {
      setRestablecerEnProgreso(false);
    }
  };

  return (
    <div className="auth-page">
      <div className={contenedorClase} id="contenedorAutenticacion">
        {/* Panel de Registro */}
        <div className="form-container sign-up">
          <form onSubmit={manejarEnvioRegistro} aria-label="Formulario de registro">
            <img src={logo} alt="Coop Prestamos" className="form-title-logo" />

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

            <div className="form-grid">
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
                type="text"
                placeholder="Documento"
                name="documento"
                value={documento}
                onChange={(e) => setDocumento(e.target.value)}
                required
                autoComplete="off"
              />
              <input
                type="tel"
                placeholder="Telefono"
                name="telefono"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                required
                autoComplete="tel"
              />
              <input
                type="text"
                placeholder="Direccion"
                name="direccion"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                required
                autoComplete="street-address"
              />
              <input
                type="email"
                placeholder="Correo electronico"
                name="correo"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                required
                autoComplete="email"
              />
              <input
                type="password"
                placeholder="Contrasena"
                name="contrasena"
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
                required
                autoComplete="new-password"
                minLength={6}
              />
            </div>

            <button type="submit">Registrarme</button>
          </form>
        </div>

        {/* Panel de Inicio de Sesion */}
        <div className="form-container sign-in">
          <form onSubmit={manejarEnvioInicioSesion} aria-label="Formulario de inicio de sesion">
            <img src={logo} alt="Coop Prestamos" className="form-title-logo" />

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

            <span>o usa tu correo y contrasena</span>

            <input
              type="email"
              placeholder="Correo electronico"
              name="correo"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              required
              autoComplete="email"
            />
            <input
              type="password"
              placeholder="Contrasena"
              name="contrasena"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              required
              autoComplete="current-password"
              minLength={6}
            />

            <button
              type="button"
              className="link-button"
              onClick={() => setModoVista("recuperar")}
              aria-label="Recuperar contrasena"
            >
              Olvidaste tu contrasena?
            </button>
            <button type="submit">Ingresar</button>
          </form>
        </div>

        {/* Toggle / Mensajes laterales */}
        <div className="toggle-container" aria-hidden={true}>
          <div className="toggle">
            <div className="toggle-panel toggle-left">
              <h1>Bienvenido de nuevo!</h1>
              <p>Ingresa tus datos personales para usar todas las funciones.</p>
              <button
                className="hidden"
                id="btnIrIniciar"
                type="button"
                onClick={() => setModoVista("iniciar")}
                aria-label="Ir a iniciar sesion"
              >
                Iniciar sesion
              </button>
            </div>
            <div className="toggle-panel toggle-right">
              <h1>Hola!</h1>
              <p>Registrate con tus datos personales para empezar a ser parte de la familia COOPRESTAMOS.</p>
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

        {/* Recuperacion de contrasena */}
        <div className={`recovery-panel ${modoVista === "recuperar" ? "visible" : ""}`}>
          <form onSubmit={manejarEnvioRecuperacion} className="recovery-card" aria-label="Recuperar contrasena">
            <img src={logo} alt="Coop Prestamos" className="form-title-logo" />
            <p className="eyebrow-text">Seguridad</p>
            <h2>Recuperar contrasena</h2>
            <p className="helper-text">
              Ingresa tu correo y te enviaremos un enlace para crear una nueva contrasena. Si no recibes nada, revisa
              spam o intenta con otro correo.
            </p>
            <input
              type="email"
              placeholder="Correo electronico"
              name="correoRecuperacion"
              value={correoRecuperacion}
              onChange={(e) => setCorreoRecuperacion(e.target.value)}
              required
              autoComplete="email"
            />
            {recuperacionMensaje && <div className="feedback success">{recuperacionMensaje}</div>}
            {recuperacionError && <div className="feedback danger">{recuperacionError}</div>}
            <div className="actions-row">
              <button
                type="button"
                className="ghost"
                onClick={() => {
                  setModoVista("iniciar");
                  setRecuperacionError(null);
                  setRecuperacionMensaje(null);
                }}
              >
                Volver a iniciar sesion
              </button>
              <button type="submit" disabled={recuperacionEnProgreso}>
                {recuperacionEnProgreso ? "Enviando..." : "Enviar enlace"}
              </button>
            </div>
          </form>
        </div>

        {/* Restablecer contrasena (desde enlace) */}
        <div className={`recovery-panel ${modoVista === "restablecer" ? "visible" : ""}`}>
          <form onSubmit={manejarEnvioRestablecer} className="recovery-card" aria-label="Definir nueva contrasena">
            <img src={logo} alt="Coop Prestamos" className="form-title-logo" />
            <p className="eyebrow-text">Seguridad</p>
            <h2>Define tu nueva contrasena</h2>
            <p className="helper-text">
              Crea una contrasena segura. El enlace caduca a las 24 horas o tras usarlo. Si falla, solicita otro correo.
            </p>
            <input
              type="password"
              placeholder="Nueva contrasena"
              name="nuevaContrasena"
              value={nuevaContrasena}
              onChange={(e) => setNuevaContrasena(e.target.value)}
              required
              autoComplete="new-password"
              minLength={6}
            />
            <input
              type="password"
              placeholder="Confirmar contrasena"
              name="confirmarContrasena"
              value={confirmarContrasena}
              onChange={(e) => setConfirmarContrasena(e.target.value)}
              required
              autoComplete="new-password"
              minLength={6}
            />
            {restablecerMensaje && <div className="feedback success">{restablecerMensaje}</div>}
            {restablecerError && <div className="feedback danger">{restablecerError}</div>}
            <div className="actions-row">
              <button
                type="button"
                className="ghost"
                onClick={() => {
                  setModoVista("iniciar");
                  setRestablecerError(null);
                  setRestablecerMensaje(null);
                }}
              >
                Volver al login
              </button>
              <button type="submit" disabled={restablecerEnProgreso}>
                {restablecerEnProgreso ? "Guardando..." : "Guardar contrasena"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
