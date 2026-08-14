// frontend/src/modules/auth/types/auth.types.ts
export type CurrentUser = {
  id: string;
  email: string;
  role: {
    id: string;
    name: string;
    label: string;
  };
  permissions: string[];
};