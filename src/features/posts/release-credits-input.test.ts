import { describe, expect, it } from "vitest";

import { applyCreditRole, getCreditRoleSuggestions } from "./release-credits-input";

describe("release credit role autocomplete", () => {
  it("suggests roles for the active credit line", () => {
    const value = "Ari Vega | pro";
    expect(getCreditRoleSuggestions(value, value.length)).toEqual(["producer"]);
  });

  it("closes suggestions once a complete role has been entered", () => {
    const value = "Ari Vega | producer";
    expect(getCreditRoleSuggestions(value, value.length)).toEqual([]);
  });

  it("does not suggest roles before a role separator", () => {
    expect(getCreditRoleSuggestions("Ari Vega", 8)).toEqual([]);
  });

  it("replaces only the role on the active line", () => {
    const value = "Ari Vega | pro\nMina Cole | vocalist";
    const result = applyCreditRole(value, "Ari Vega | pro".length, "producer");
    expect(result.value).toBe("Ari Vega | producer\nMina Cole | vocalist");
  });

  it("adds a separator when a visible role chip is selected after a name", () => {
    expect(applyCreditRole("Ari Vega", 8, "artist").value).toBe("Ari Vega | artist");
  });
});
