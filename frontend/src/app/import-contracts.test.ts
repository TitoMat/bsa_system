// R5C regression test: verifies key ES module exports can be imported
// by the consumer pages that depend on them, catching default/named
// mismatches that escape Jest/Vitest's mock-based testing.

import { describe, it, expect } from "vitest";

describe("module export contracts", () => {
  it("BsaMap is default-exported and importable", async () => {
    const mod = await import("../modules/maps/components/BsaMap");
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe("function");
  });

  it("TransportationRequestsPage imports without throwing", async () => {
    let err: unknown = null;
    try {
      await import("../modules/transportation/pages/TransportationRequestsPage");
    } catch (e) {
      err = e;
    }
    expect(err).toBeNull();
  });

  it("FleetInsightsPage imports without throwing", async () => {
    let err: unknown = null;
    try {
      await import("../modules/transportation/pages/FleetInsightsPage");
    } catch (e) {
      err = e;
    }
    expect(err).toBeNull();
  });

  it("LodgeTransportationRequestPage imports without throwing", async () => {
    let err: unknown = null;
    try {
      await import("../modules/transportation/pages/LodgeTransportationRequestPage");
    } catch (e) {
      err = e;
    }
    expect(err).toBeNull();
  });

  it("RequestDetailsModal imports without throwing", async () => {
    let err: unknown = null;
    try {
      await import("../modules/transportation/components/RequestDetailsModal");
    } catch (e) {
      err = e;
    }
    expect(err).toBeNull();
  });
});
