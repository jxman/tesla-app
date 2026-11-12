import { describe, it, expect } from "vitest";
import { directionsUrl } from "../../../src/shared/directions";

describe("directionsUrl", () => {
  it("builds a driving directions link from the app location", () => {
    const url = new URL(directionsUrl({ lat: 42.2073, lon: -71.1484 }, { lat: 42.3601, lon: -71.0589 }));
    expect(url.origin + url.pathname).toBe("https://www.google.com/maps/dir/");
    expect(url.searchParams.get("api")).toBe("1");
    expect(url.searchParams.get("origin")).toBe("42.2073,-71.1484");
    expect(url.searchParams.get("destination")).toBe("42.3601,-71.0589");
    expect(url.searchParams.get("travelmode")).toBe("driving");
  });

  it("omits the origin when the location is unknown", () => {
    const url = new URL(directionsUrl({ lat: null, lon: undefined }, { lat: 1, lon: 2 }));
    expect(url.searchParams.has("origin")).toBe(false);
    expect(url.searchParams.get("destination")).toBe("1,2");
  });

  it("rounds GPS coordinates to 5 decimals", () => {
    const url = new URL(directionsUrl({ lat: 42.20515041453529, lon: -71.23876135943641 }, { lat: 1, lon: 2 }));
    expect(url.searchParams.get("origin")).toBe("42.20515,-71.23876");
  });
});
