// backend/src/common/types/auth-user.type.ts

export type AuthUserPayload = {
  id: string;
  email: string;
  role: {
    id: string;
    name: string;
    label: string;
  };
  permissions: string[];
};
