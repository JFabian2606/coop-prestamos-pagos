import axios from "axios";
import { supabase } from "./supabaseClient";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// Inyecta el token de Supabase en cada request
api.interceptors.request.use(async (config) => {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) {
      config.headers = config.headers ?? {};
      (config.headers as any).Authorization = `Bearer ${token}`;
    }
  } catch (e) {
    // noop
  }
  return config;
});
