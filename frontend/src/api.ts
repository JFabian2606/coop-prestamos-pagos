import axios, { AxiosHeaders, isAxiosError } from "axios";
import { supabase } from "./supabaseClient";

const rawBaseUrl = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000/api/";
const baseURL = rawBaseUrl.endsWith("/") ? rawBaseUrl : `${rawBaseUrl}/`;
const parsedTimeout = Number(import.meta.env.VITE_API_TIMEOUT ?? 10000);
const timeout = Number.isFinite(parsedTimeout) ? parsedTimeout : 10000;
const EARLY_REFRESH_WINDOW_MS = 5000;

type TokenSnapshot = {
  value: string | null;
  expiresAt: number;
  inflight?: Promise<string | null>;
};

const tokenSnapshot: TokenSnapshot = {
  value: null,
  expiresAt: 0,
};

const readSessionToken = async (): Promise<string | null> => {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.warn("No se pudo obtener la sesión de Supabase", error.message);
      return null;
    }
    const token = data.session?.access_token ?? null;
    tokenSnapshot.value = token;
    tokenSnapshot.expiresAt = data.session?.expires_at ? data.session.expires_at * 1000 : 0;
    return token;
  } catch (error) {
    console.warn("Error leyendo la sesión de Supabase", error);
    return null;
  }
};

const ensureAccessToken = async (): Promise<string | null> => {
  const now = Date.now();
  if (
    tokenSnapshot.value &&
    tokenSnapshot.expiresAt &&
    tokenSnapshot.expiresAt - EARLY_REFRESH_WINDOW_MS > now
  ) {
    return tokenSnapshot.value;
  }

  if (!tokenSnapshot.inflight) {
    tokenSnapshot.inflight = readSessionToken().finally(() => {
      tokenSnapshot.inflight = undefined;
    });
  }

  return tokenSnapshot.inflight;
};

supabase.auth.onAuthStateChange((_event, session) => {
  tokenSnapshot.value = session?.access_token ?? null;
  tokenSnapshot.expiresAt = session?.expires_at ? session.expires_at * 1000 : 0;
});

export const api = axios.create({
  baseURL,
  timeout,
});

api.interceptors.request.use(async (config) => {
  const token = await ensureAccessToken();
  if (token) {
    const headers = AxiosHeaders.from(config.headers || {});
    headers.set("Authorization", `Bearer ${token}`);
    config.headers = headers;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (isAxiosError(error) && error.response?.status === 401) {
      tokenSnapshot.value = null;
      tokenSnapshot.expiresAt = 0;
    }
    return Promise.reject(error);
  }
);
