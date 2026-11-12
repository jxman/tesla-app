import { describe, expect, it } from "vitest";
import { compass, describeWind } from "../../../src/shared/wind.js";

describe("compass", () => {
  it("maps degrees to 8 points", () => {
    expect(compass(0)).toBe("N");
    expect(compass(350)).toBe("N");
    expect(compass(315)).toBe("NW");
    expect(compass(200)).toBe("S");
    expect(compass(-45)).toBe("NW");
    expect(compass(undefined)).toBeNull();
  });
});

describe("describeWind", () => {
  it("converts to mph, keeps notable gusts, and points the arrow downwind", () => {
    expect(describeWind({ speed: 5.4, gust: 11.2, deg: 315 })).toEqual({ speed: 12, gust: 25, from: "NW", arrowDeg: 135 });
  });
  it("drops gusts close to the steady wind and handles missing direction", () => {
    expect(describeWind({ speed: 5.4, gust: 6.5 })).toEqual({ speed: 12, gust: null, from: null, arrowDeg: null });
    expect(describeWind(undefined).speed).toBe(0);
  });
});
