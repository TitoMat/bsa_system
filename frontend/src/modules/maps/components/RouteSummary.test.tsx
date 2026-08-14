import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RouteSummary } from "./RouteSummary";
import type { RouteResult } from "../types/maps.types";

const route: RouteResult = {
  distanceMeters: 20300,
  durationSeconds: 1560,
  distanceLabel: "20.3 km",
  durationLabel: "26 minutes",
  geometry: {
    type: "LineString",
    coordinates: [
      [120.9842, 14.5995],
      [121.05, 14.6],
    ],
  },
};

describe("RouteSummary", () => {
  it("renders nothing when there is no route and no error", () => {
    const { container } = render(
      <RouteSummary route={null} pickupAddress="" destinationAddress="" />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders addresses, distance, ETA and actions when a route exists", () => {
    render(
      <RouteSummary
        route={route}
        pickupAddress="Pasig City, Metro Manila"
        destinationAddress="Mandaluyong City, Metro Manila"
        onSwap={() => {}}
        onClear={() => {}}
        onConfirm={() => {}}
      />,
    );
    expect(screen.getByLabelText("Route summary")).toBeInTheDocument();
    expect(screen.getByText("Pasig City, Metro Manila")).toBeInTheDocument();
    expect(screen.getByText("Mandaluyong City, Metro Manila")).toBeInTheDocument();
    expect(screen.getByText("20.3 km")).toBeInTheDocument();
    expect(screen.getByText("Approximately 26 minutes")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Swap" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear Route" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm Route" })).toBeInTheDocument();
  });

  it("exposes the full address as a native title tooltip", () => {
    const longAddress = "Brgy. Lot 12, Phase 3, Congressional Avenue Extension, Barangay 177, Caloocan City, Metro Manila, Philippines";
    render(
      <RouteSummary
        route={route}
        pickupAddress={longAddress}
        destinationAddress="Short address"
      />,
    );
    const pickup = screen.getByText(longAddress);
    expect(pickup).toHaveAttribute("title", longAddress);
    expect(pickup.className).toContain("bsa-map-address");
  });

  it("announces route errors through a status region", () => {
    render(
      <RouteSummary
        route={null}
        pickupAddress=""
        destinationAddress=""
        error="Unable to calculate a route"
      />,
    );
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Unable to calculate a route");
  });

  it("keeps action handlers wired", () => {
    const onConfirm = vi.fn();
    render(
      <RouteSummary
        route={route}
        pickupAddress="A"
        destinationAddress="B"
        onConfirm={onConfirm}
      />,
    );
    screen.getByRole("button", { name: "Confirm Route" }).click();
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});