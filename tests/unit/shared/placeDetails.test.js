import { describe, it, expect } from "vitest";
import { formatPhone, websiteLabel, shortAddress, voicePhrase } from "../../../src/shared/placeDetails";

describe("formatPhone", () => {
  it("formats US numbers", () => {
    expect(formatPhone("+1 508-359-1234")).toBe("(508) 359-1234");
    expect(formatPhone("508.359.1234")).toBe("(508) 359-1234");
    expect(formatPhone("+1 508 359 1234;+1 508 359 9999")).toBe("(508) 359-1234");
  });
  it("leaves other numbers alone", () => {
    expect(formatPhone("+44 20 7946 0958")).toBe("+44 20 7946 0958");
    expect(formatPhone(null)).toBeNull();
  });
});

describe("websiteLabel", () => {
  it("shows a short domain and path", () => {
    expect(websiteLabel("https://www.starbucks.com/store/123/")).toBe("starbucks.com/store/123");
    expect(websiteLabel("http://example.org")).toBe("example.org");
  });
  it("rejects non-web links", () => {
    expect(websiteLabel("javascript:alert(1)")).toBeNull();
    expect(websiteLabel("not a url")).toBeNull();
  });
});

describe("voicePhrase", () => {
  it("uses name and street for businesses", () => {
    expect(voicePhrase({ name: "Starbucks", address: "467 Main St, Medfield" })).toBe("Navigate to Starbucks, 467 Main St, Medfield");
  });
  it("uses the address alone when it already starts with the name", () => {
    expect(voicePhrase({ name: "Keystone Custodian Funds", address: "Keystone Custodian Funds, 99 High St, Boston, MA 02110, United States of America" }))
      .toBe("Navigate to Keystone Custodian Funds, 99 High St, Boston, MA 02110");
  });
  it("falls back to the name", () => {
    expect(voicePhrase({ name: "Rocky Woods", address: null })).toBe("Navigate to Rocky Woods");
  });
  it("strips the country", () => {
    expect(shortAddress("1 Main St, Boston, MA, United States")).toBe("1 Main St, Boston, MA");
  });
});
