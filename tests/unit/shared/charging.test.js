import { describe, expect, it } from "vitest";
import { chargingInfo, chargingSummary, chargerName, isKeptSocketTag } from "../../../src/shared/charging.js";

const ev = (tags) => ({ amenity: "charging_station", ...tags });

describe("chargingInfo", () => {
  it("ignores non-chargers", () => {
    expect(chargingInfo({ amenity: "cafe" })).toBeNull();
  });

  it("summarises a Supercharger", () => {
    const info = chargingInfo(ev({ "socket:nacs": "8", "socket:nacs:output": "150", capacity: "8", fee: "yes", access: "customers", network: "Supercharger" }));
    expect(info).toMatchObject({ plugs: ["Tesla"], kw: 150, stalls: 8, free: false, customersOnly: true, rank: 0 });
    expect(chargingSummary(info)).toBe("Tesla · 150 kW · 8 stalls");
  });

  it("lists plugs in a fixed order and takes the fastest output", () => {
    const info = chargingInfo(ev({
      "socket:type1_cable": "6", "socket:type1_cable:output": "16.64 kW",
      "socket:type1_combo": "8", "socket:chademo": "2", "socket:chademo:output": "50 kW",
    }));
    expect(info.plugs).toEqual(["CCS", "CHAdeMO", "J1772"]);
    expect(info.kw).toBe(50);
    expect(info.rank).toBe(1);
  });

  it("treats a Tesla network with no socket tags as Tesla", () => {
    expect(chargingInfo(ev({ network: "Supercharger", operator: "Tesla" })).plugs).toEqual(["Tesla"]);
  });

  it("ranks unknown plugs above J1772-only, and flags free chargers", () => {
    expect(chargingInfo(ev({})).rank).toBe(2);
    const slow = chargingInfo(ev({ "socket:type1": "2", fee: "no" }));
    expect(slow).toMatchObject({ rank: 3, free: true });
    expect(chargingSummary(chargingInfo(ev({})))).toBe("EV charger");
  });

  it("parses watts and semicolon lists, ignoring junk", () => {
    expect(chargingInfo(ev({ "socket:type2:output": "22000 W" })).kw).toBe(22);
    expect(chargingInfo(ev({ "socket:nacs:output": "72 kW;250 kW" })).kw).toBe(250);
    expect(chargingInfo(ev({ "socket:nacs:output": "fast" })).kw).toBeNull();
  });
});

describe("helpers", () => {
  it("names unnamed chargers", () => {
    expect(chargerName({ network: "ChargePoint" })).toBe("ChargePoint");
    expect(chargerName({})).toBe("EV charger");
  });

  it("keeps only socket type and output tags", () => {
    expect(isKeptSocketTag("socket:nacs")).toBe(true);
    expect(isKeptSocketTag("socket:nacs:output")).toBe(true);
    expect(isKeptSocketTag("socket:nacs:voltage")).toBe(false);
  });
});
