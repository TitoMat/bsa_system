// frontend/src/api/auth.ts
import { api } from "./axios";
import { clearSession, startSession } from "../lib/session";

type LoginPayload = {
  email: string;
  password: string;
};

type ChangePasswordPayload = {
  currentPassword: string;
  newPassword: string;
};

export async function loginRequest(payload: LoginPayload) {
  const response = await api.post("/auth/login", payload);
  startSession();
  return response.data;
}

export async function meRequest() {
  const response = await api.get("/auth/me");
  return response.data.user;
}

export async function refreshTokenRequest() {
  const response = await api.post("/auth/refresh");
  return response.data.token as string;
}

export async function changePasswordRequest(payload: ChangePasswordPayload) {
  const response = await api.patch("/auth/change-password", payload);
  return response.data;
}

export async function logoutRequest() {
  const response = await api.post("/auth/logout");
  clearSession();
  return response.data;
}

export async function updateThemeRequest(themePreference: string) {
  const response = await api.patch("/auth/theme", { themePreference });
  return response.data;
}