import { render, screen, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from "vitest";
import { AuthBootstrap } from "./AuthBootstrap";

vi.mock("../api/auth", () => ({ meRequest: vi.fn() }));
vi.mock("../features/auth/useAuthStore", () => ({
  useAuthStore: vi.fn(),
}));
vi.mock("../hooks/useTheme", () => ({
  useTheme: vi.fn(() => ({ setPreference: vi.fn() })),
}));
vi.mock("../lib/session", () => ({ startSession: vi.fn() }));

import { meRequest } from "../api/auth";
import { useAuthStore } from "../features/auth/useAuthStore";

function setupMocks(overrides: { user?: unknown; setUser?: unknown }) {
  (useAuthStore as unknown as Mock).mockImplementation(
    (selector: (state: unknown) => unknown) => {
      return selector({
        user: overrides.user ?? null,
        setUser: overrides.setUser ?? vi.fn(),
      });
    },
  );
}

describe("AuthBootstrap", () => {
  beforeEach(() => {
    const splash = document.createElement("div");
    splash.id = "boot-splash";
    document.body.appendChild(splash);
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    document.getElementById("boot-splash")?.remove();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("removes splash immediately and renders children on mount", async () => {
    const setUser = vi.fn();
    setupMocks({ setUser });

    render(
      <AuthBootstrap>
        <div data-testid="app">App Content</div>
      </AuthBootstrap>,
    );

    // Initially splash present but mounting
    const splash = document.getElementById("boot-splash");
    expect(splash).not.toBeNull();

    // Advance past animation frame + splash hide timeout
    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    // Splash should be gone, children should render
    expect(screen.getByTestId("app")).toBeInTheDocument();
    expect(splash?.classList.contains("hide")).toBe(true);
  });

  it("calls meRequest in background after splash removal", async () => {
    (meRequest as unknown as Mock).mockResolvedValue({
      id: "u-1",
      name: "Test",
      themePreference: "light",
    });
    const setUser = vi.fn();
    setupMocks({ setUser });

    render(
      <AuthBootstrap>
        <div data-testid="app">App Content</div>
      </AuthBootstrap>,
    );

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    // Children render, meRequest called
    expect(screen.getByTestId("app")).toBeInTheDocument();
    expect(meRequest).toHaveBeenCalled();
  });

  it("handles 401 in background without blocking children", async () => {
    (meRequest as unknown as Mock).mockRejectedValue(new Error("401"));
    const setUser = vi.fn();
    setupMocks({ setUser });

    render(
      <AuthBootstrap>
        <div data-testid="app">App</div>
      </AuthBootstrap>,
    );

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(screen.getByTestId("app")).toBeInTheDocument();
  });

  it("handles network error in background without blocking children", async () => {
    (meRequest as unknown as Mock).mockRejectedValue(
      new Error("Network Error"),
    );
    const setUser = vi.fn();
    setupMocks({ setUser });

    render(
      <AuthBootstrap>
        <div data-testid="app">App</div>
      </AuthBootstrap>,
    );

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(screen.getByTestId("app")).toBeInTheDocument();
  });
});
