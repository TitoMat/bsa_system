import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AssignmentDiagnosticsPanel } from "./AssignmentDiagnosticsPanel";
import type { AssignmentDiagnosticsResult } from "../types/transportation.types";

const makeResult = (overrides: Partial<AssignmentDiagnosticsResult> = {}): AssignmentDiagnosticsResult => ({
  request: {
    id: "req-1",
    requestNumber: "TR-2026-0001",
    serviceStartAt: "2026-08-12T01:00:00.000Z",
    serviceEndAt: "2026-08-12T04:00:00.000Z",
    serviceWindowComplete: true,
    passengerCount: 5,
    currentAssignment: null,
  },
  route: {
    status: "AVAILABLE",
    distanceMeters: 14800,
    durationSeconds: 1860,
    provider: "OSRM",
    calculatedAt: "2026-08-12T00:30:00.000Z",
  },
  drivers: {
    eligible: [
      {
        driverId: "d-1",
        driverName: "Driver 1",
        hasLiveLocation: true,
        eligible: true,
        availability: {
          available: true,
          reasons: [],
          warnings: [],
          evaluatedStartAt: "2026-08-12T01:00:00.000Z",
          evaluatedEndAt: "2026-08-12T04:00:00.000Z",
        },
        score: 83,
        scoreComponents: { workload: 75, scheduleFit: 8 },
        currentWorkload: 0,
        warnings: [],
        exclusionReasons: [],
        conflict: null,
      },
    ],
    excluded: [
      {
        driverId: "d-2",
        driverName: "Driver 2",
        hasLiveLocation: false,
        eligible: false,
        availability: {
          available: false,
          reasons: ["NO_DUTY_SCHEDULE"],
          warnings: [],
          evaluatedStartAt: "2026-08-12T01:00:00.000Z",
          evaluatedEndAt: "2026-08-12T04:00:00.000Z",
        },
        score: null,
        scoreComponents: null,
        currentWorkload: 0,
        warnings: [],
        exclusionReasons: ["NO_DUTY_SCHEDULE"],
        conflict: null,
      },
    ],
  },
  vehicles: {
    eligible: [
      {
        vehicleId: "car-1",
        vehicleName: "Toyota Camry",
        plateNumber: "ABC-1234",
        eligible: true,
        availability: {
          available: true,
          reasons: [],
          warnings: [],
          evaluatedStartAt: "2026-08-12T01:00:00.000Z",
          evaluatedEndAt: "2026-08-12T04:00:00.000Z",
        },
        score: 100,
        scoreComponents: { capacityFit: 60, workload: 40 },
        capacity: 5,
        currentWorkload: 0,
        warnings: [],
        exclusionReasons: [],
        conflict: null,
      },
    ],
    excluded: [],
  },
  ...overrides,
});

describe("AssignmentDiagnosticsPanel", () => {
  it("renders nothing when there is no result", () => {
    const { container } = render(
      <AssignmentDiagnosticsPanel result={null} loading={false} error={null} refreshingRoute={false} onCalculateRoute={() => {}} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("announces the loading state", () => {
    render(
      <AssignmentDiagnosticsPanel result={null} loading error={null} refreshingRoute={false} onCalculateRoute={() => {}} />,
    );
    expect(screen.getByText(/loading assignment diagnostics/i)).toBeInTheDocument();
  });

  it("renders the diagnostics error", () => {
    render(
      <AssignmentDiagnosticsPanel result={null} loading={false} error="Could not load assignment diagnostics" refreshingRoute={false} onCalculateRoute={() => {}} />,
    );
    expect(screen.getByText("Could not load assignment diagnostics")).toBeInTheDocument();
  });

  it("renders ranked eligible lists with scores and component breakdowns", () => {
    render(
      <AssignmentDiagnosticsPanel result={makeResult()} loading={false} error={null} refreshingRoute={false} onCalculateRoute={() => {}} />,
    );
    expect(screen.getByText("Best Fit Drivers")).toBeInTheDocument();
    expect(screen.getByText("Driver 1")).toBeInTheDocument();
    expect(screen.getByText("83")).toBeInTheDocument();
    expect(screen.getByText(/0 assignments \/ 30d · Workload 75 · Shift fit 8/)).toBeInTheDocument();
    expect(screen.getByText("Toyota Camry")).toBeInTheDocument();
    expect(screen.getByText(/Capacity fit 60 · Workload 40/)).toBeInTheDocument();
    expect(screen.getByText("100")).toBeInTheDocument();
  });

  it("shows human-readable exclusion reasons for excluded resources", () => {
    const result = makeResult({
      drivers: {
        eligible: [],
        excluded: [
          {
            ...makeResult().drivers.excluded[0],
            exclusionReasons: ["EXISTING_REQUEST_CONFLICT"],
            conflict: {
              requestId: "req-9",
              requestNumber: "TR-2026-0009",
              startAt: "2026-08-12T01:30:00.000Z",
              endAt: "2026-08-12T05:00:00.000Z",
              source: "LEGACY" as const,
            },
          },
        ],
      },
    });
    render(
      <AssignmentDiagnosticsPanel result={result} loading={false} error={null} refreshingRoute={false} onCalculateRoute={() => {}} />,
    );
    expect(screen.getByText(/TR-2026-0009/)).toBeInTheDocument();
    expect(screen.getByText("No eligible drivers")).toBeInTheDocument();
  });

  it("renders the route snapshot summary", () => {
    render(
      <AssignmentDiagnosticsPanel result={makeResult()} loading={false} error={null} refreshingRoute={false} onCalculateRoute={() => {}} />,
    );
    expect(screen.getByText("14.8 km · 31m")).toBeInTheDocument();
    expect(screen.getByText(/via OSRM/)).toBeInTheDocument();
  });

  it("offers Calculate Route when no snapshot exists", () => {
    const onCalculateRoute = vi.fn();
    const result = makeResult({
      route: {
        status: "UNAVAILABLE",
        distanceMeters: null,
        durationSeconds: null,
        provider: null,
        calculatedAt: null,
      },
    });
    render(
      <AssignmentDiagnosticsPanel result={result} loading={false} error={null} refreshingRoute={false} onCalculateRoute={onCalculateRoute} />,
    );
    const button = screen.getByRole("button", { name: "Calculate Route" });
    fireEvent.click(button);
    expect(onCalculateRoute).toHaveBeenCalledTimes(1);
  });

  it("disables Calculate Route while a calculation is running", () => {
    const result = makeResult({ route: { status: "UNAVAILABLE", distanceMeters: null, durationSeconds: null, provider: null, calculatedAt: null } });
    render(
      <AssignmentDiagnosticsPanel result={result} loading={false} error={null} refreshingRoute onCalculateRoute={() => {}} />,
    );
    expect(screen.getByRole("button", { name: "Calculating…" })).toBeDisabled();
  });

  it("warns and renders no candidate lists when the service window is incomplete", () => {
    const result = makeResult({
      request: {
        ...makeResult().request,
        serviceWindowComplete: false,
      },
    });
    render(
      <AssignmentDiagnosticsPanel result={result} loading={false} error={null} refreshingRoute={false} onCalculateRoute={() => {}} />,
    );
    expect(screen.getByText(/Service end is missing/)).toBeInTheDocument();
    expect(screen.queryByText("Best Fit Drivers")).not.toBeInTheDocument();
  });
});