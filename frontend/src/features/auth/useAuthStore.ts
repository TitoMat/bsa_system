// frontend/src/features/auth/useAuthStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { clearSession } from "../../lib/session";
import { notifySessionExpiring } from "../../lib/sessionExpiration";
import { meRequest } from "../../api/auth";

export type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions?: string[];
  mustChangePassword?: boolean;
  themePreference?: string;
  avatarUrl?: string | null;
  employeeId?: string | null;
  phone?: string | null;
  department?: string | null;
  position?: string | null;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type AuthState = {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  hydrated: boolean;
  setHydrated: (value: boolean) => void;
  setAuth: (payload: { user: User; token: string }) => void;
  setToken: (token: string) => void;
  setUser: (user: User | null) => void;
  refreshMe: () => Promise<User | null>;
  logoutLocal: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      hydrated: false,

      setHydrated: (value) => {
        set({ hydrated: value });
      },

      setAuth: ({ user, token }) => {
        set({
          user,
          token,
          isAuthenticated: true,
        });
      },

      setToken: (token) => {
        set((state) => ({
          token,
          isAuthenticated: !!token && !!state.user,
        }));
      },

      setUser: (user) => {
        set((state) => ({
          user,
          token: user ? state.token : null,
          isAuthenticated: !!user,
        }));
      },

      refreshMe: async () => {
        try {
          const freshUser = await meRequest();

          set((state) => ({
            user: freshUser,
            token: freshUser ? state.token : null,
            isAuthenticated: !!freshUser,
          }));

          return freshUser;
        } catch {
          await notifySessionExpiring({ reason: "api" });
          set({
            user: null,
            token: null,
            isAuthenticated: false,
          });

          clearSession();
          return null;
        }
      },

      logoutLocal: () => {
        console.log("[AUTH] logoutLocal triggered");

        clearSession();

        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });
      },
    }),
    {
      name: "bsa-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);
