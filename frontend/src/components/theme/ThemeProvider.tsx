import { createContext, useEffect, useMemo, useRef, useState } from "react";
import type { PropsWithChildren } from "react";
import { api } from "../../api/axios";

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export interface ThemeContextValue {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setPreference: (value: ThemePreference) => void;
}

const STORAGE_KEY = "bsa-system-theme";

export const ThemeContext = createContext<ThemeContextValue | null>(null);

function getStoredPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch {}
  return "system";
}

function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return preference;
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const [preference, setPreferenceState] = useState<ThemePreference>(
    getStoredPreference
  );
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    resolveTheme(preference)
  );
  const mediaQueryRef = useRef<MediaQueryList | null>(null);

  function setPreference(value: ThemePreference) {
    setPreferenceState(value);
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {}
    document.documentElement.dataset.themePreference = value;
    api.patch("/auth/theme", { themePreference: value }).catch(() => {});
  }

  useEffect(() => {
    const resolved = resolveTheme(preference);
    setResolvedTheme(resolved);
    document.documentElement.dataset.theme = resolved;
  }, [preference]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mediaQueryRef.current = mq;

    function handleChange() {
      if (preference === "system") {
        const resolved = resolveTheme("system");
        setResolvedTheme(resolved);
        document.documentElement.dataset.theme = resolved;
      }
    }

    mq.addEventListener("change", handleChange);
    return () => mq.removeEventListener("change", handleChange);
  }, [preference]);

  const value = useMemo(
    () => ({ preference, resolvedTheme, setPreference }),
    [preference, resolvedTheme]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
