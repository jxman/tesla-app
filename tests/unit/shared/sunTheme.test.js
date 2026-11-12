import { describe, it, expect } from "vitest";
import { sunTheme } from "../../../src/shared/sunTheme";

const DAY = 86400;
// 2026-11-11 Boston: sunrise 06:34 EST (11:34Z), sunset 16:25 EST (21:25Z)
const rise = Date.UTC(2026, 10, 11, 11, 34) / 1000;
const set = Date.UTC(2026, 10, 11, 21, 25) / 1000;
const at = (h, m = 0, day = 11) => Date.UTC(2026, 10, day, h, m);

describe("sunTheme", () => {
  it("is light between sunrise and sunset and switches at sunset", () => {
    expect(sunTheme(at(15), rise, set)).toEqual({ theme: "light", nextChange: set * 1000 });
  });

  it("is dark after sunset until the next sunrise", () => {
    expect(sunTheme(at(23), rise, set)).toEqual({ theme: "dark", nextChange: (rise + DAY) * 1000 });
  });

  it("is dark before today's sunrise", () => {
    const r = sunTheme(at(9), rise, set);
    expect(r).toEqual({ theme: "dark", nextChange: rise * 1000 });
  });

  it("shifts stale times from an earlier day", () => {
    expect(sunTheme(at(15, 0, 13), rise, set).theme).toBe("light");
    expect(sunTheme(at(23, 0, 13), rise, set).nextChange).toBe((rise + 3 * DAY) * 1000);
  });

  it("falls back to the local clock without sun times", () => {
    const noon = new Date(2026, 10, 11, 12).getTime();
    const night = new Date(2026, 10, 11, 22).getTime();
    expect(sunTheme(noon).theme).toBe("light");
    expect(sunTheme(night).theme).toBe("dark");
  });
});
