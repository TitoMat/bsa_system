// frontend/src/api/axios.ts
import axios from "axios";
import { useAuthStore } from "../features/auth/useAuthStore";
import {
  notifySessionExpired,
} from "../lib/sessionExpiration";
import { ensureFreshToken } from "../lib/tokenRefresh";

type AxiosConfigWithAuthHandled = {
  _authHandled?: boolean;
  url?: string;
  headers?: Record<string, string>;
};

const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "/api";

export const api = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
  timeout: 30000,
});

api.interceptors.request.use(async (config) => {
  const token = useAuthStore.getState().token;
  const url = config.url ?? "";
  const isLoginRequest = url.includes("/auth/login");

  if (token && !isLoginRequest) {
    config.headers = config.headers ?? {};

    if (url.includes("/auth/refresh")) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      const fresh = await ensureFreshToken();
      config.headers.Authorization = `Bearer ${fresh ?? token}`;
    }
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const config = (error.config ?? {}) as AxiosConfigWithAuthHandled;
    const url = config.url ?? "";
    const currentPath = window.location.pathname;

    if (import.meta.env.DEV) {
      console.warn("[API ERROR]", { status, url, currentPath, apiBaseUrl });
    }

    if (status === 401 || status === 419 || status === 440) {
      const isLoginRequest = url.includes("/auth/login");
      const isLogoutRequest = url.includes("/auth/logout");
      const isRefreshRequest = url.includes("/auth/refresh");
      const isAlreadyOnLogin = currentPath === "/login";
      const isAlreadyHandled = config._authHandled === true;

      if (!isLoginRequest && !isAlreadyOnLogin && !isAlreadyHandled) {
        config._authHandled = true;

        if (import.meta.env.DEV) {
          console.warn("[AUTH] Session ended. Showing sign-in notice...");
        }

        if (!isLogoutRequest && !isRefreshRequest) {
          const freshToken = await ensureFreshToken();

          if (freshToken) {
            config.headers = config.headers ?? {};
            config.headers.Authorization = `Bearer ${freshToken}`;
            return api(config);
          }
        } else if (!isLogoutRequest) {
          notifySessionExpired({ reason: "api" });
        }
      }
    }

    if (status === 403 && import.meta.env.DEV) {
      console.warn("[AUTH] Forbidden access", { url });
    }

    return Promise.reject(error);
  }
);
