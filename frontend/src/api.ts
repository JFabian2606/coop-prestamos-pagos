import axios, { isAxiosError } from "axios";

const rawBaseUrl = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000/api/";
const baseURL = rawBaseUrl.endsWith("/") ? rawBaseUrl : `${rawBaseUrl}/`;
const parsedTimeout = Number(import.meta.env.VITE_API_TIMEOUT ?? 10000);
const timeout = Number.isFinite(parsedTimeout) ? parsedTimeout : 10000;

// Configurar axios para usar cookies (SessionAuthentication de Django)
export const api = axios.create({
  baseURL,
  timeout,
  withCredentials: true,  // Importante para SessionAuthentication
  xsrfCookieName: "csrftoken",
  xsrfHeaderName: "X-CSRFToken",
});

let csrfPromise: Promise<void> | null = null;

/**
 * Garantiza que exista la cookie CSRF para SessionAuthentication.
 */
export function ensureCsrfCookie() {
  if (!csrfPromise) {
    csrfPromise = api
      .get("auth/csrf/")
      .then((resp) => {
        const token = (resp.data as any)?.csrfToken;
        if (token) {
          api.defaults.headers.common["X-CSRFToken"] = token;
        }
      })
      .catch(() => {}); // si falla, se reintentará en próxima llamada
  }
  return csrfPromise;
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (isAxiosError(error) && error.response?.status === 401) {
      // Usuario no autenticado - redirigir a login
      console.warn("Sesión expirada o no autenticado");
    }
    return Promise.reject(error);
  }
);
