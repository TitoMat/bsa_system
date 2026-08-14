import { api } from "../../../api/axios";
import type { SignatureMetadata } from "../types/profile.types";

export async function getMySignature() {
  const response = await api.get("/approval-workflow/signature/me");
  return response.data as SignatureMetadata | null;
}

export async function uploadMySignature(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await api.post("/approval-workflow/signature/me", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return response.data as SignatureMetadata;
}

export async function revokeMySignature() {
  const response = await api.delete("/approval-workflow/signature/me");
  return response.data as SignatureMetadata;
}

export async function uploadMyAvatar(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await api.post("/auth/avatar", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return response.data as { avatarUrl: string };
}

export async function getMyAvatarUrl(userId: string) {
  return `/api/auth/avatar/${userId}`;
}

export async function updateMyProfile(data: {
  employeeId?: string;
  phone?: string;
  department?: string;
  position?: string;
}) {
  const res = await api.patch('/auth/me', data);
  return res.data;
}
