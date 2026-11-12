import { describe, it, expect } from "vitest";
import { clearProgress } from "../../../src/components/IncidentSheet.jsx";

describe("clearProgress", () => {
  const start = "2026-11-12T15:00:00Z";
  const end = "2026-11-12T16:00:00Z";

  it("reports the share of the window that has passed and minutes left", () => {
    expect(clearProgress(start, end, Date.parse("2026-11-12T15:45:00Z"))).toEqual({ pct: 75, label: "About 15 min left" });
  });

  it("caps at 100% once the expected clear time has passed", () => {
    expect(clearProgress(start, end, Date.parse("2026-11-12T16:30:00Z"))).toEqual({ pct: 100, label: "Should be clearing now" });
  });

  it("returns null without both times", () => {
    expect(clearProgress(start, null)).toBeNull();
    expect(clearProgress(null, end)).toBeNull();
  });
});
