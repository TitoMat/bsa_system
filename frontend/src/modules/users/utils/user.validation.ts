// frontend/src/modules/users/utils/user.validation.ts
import type {
  CreateUserPayload,
  ResetPasswordPayload,
  UpdateUserPayload,
} from "../types/user.types";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateCreateUser(
  payload: CreateUserPayload & { confirmPassword: string }
) {
  const errors: Record<string, string> = {};

  if (!payload.name.trim()) errors.name = "Required";
  if (!EMAIL_REGEX.test(payload.email)) errors.email = "Invalid email";

  if (!payload.password || payload.password.length < 8) {
    errors.password = "Min 8 chars";
  }

  if (payload.password !== payload.confirmPassword) {
    errors.confirmPassword = "Passwords do not match";
  }

  return errors;
}

export function validateEditUser(payload: UpdateUserPayload) {
  const errors: Record<string, string> = {};

  if (!payload.name.trim()) errors.name = "Required";
  if (!EMAIL_REGEX.test(payload.email)) errors.email = "Invalid email";

  return errors;
}

export function validateResetPassword(
  payload: ResetPasswordPayload & { confirmPassword: string }
) {
  const errors: Record<string, string> = {};

  if (!payload.newPassword || payload.newPassword.length < 8) {
    errors.newPassword = "Min 8 chars";
  }

  if (payload.newPassword !== payload.confirmPassword) {
    errors.confirmPassword = "Mismatch";
  }

  return errors;
}

export function generateTempPassword(length = 12) {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const numbers = "23456789";
  const symbols = "!@#$%*_-";
  const all = upper + lower + numbers + symbols;

  let password = "";
  password += upper[Math.floor(Math.random() * upper.length)];
  password += lower[Math.floor(Math.random() * lower.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];

  for (let i = password.length; i < length; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }

  return password
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
}