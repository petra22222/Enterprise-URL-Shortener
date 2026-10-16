// FILE: tests/unit/short-code.test.ts
import { describe, it, expect } from "vitest";
import { generateShortCode, validateAliasFormat } from "../../src/lib/short-code";

describe("short code generation", () => {
  it("generates a 7-character code from the safe alphabet", () => {
    const code = generateShortCode();
    expect(code).toHaveLength(7);
    expect(/^[a-zA-Z0-9]+$/.test(code)).toBe(true);
  });
  it("generates different codes across calls (probabilistic)", () => {
    const codes = new Set(Array.from({ length: 50 }, generateShortCode));
    expect(codes.size).toBe(50);
  });
});

describe("alias validation", () => {
  it("rejects aliases that are too short", () => {
    expect(validateAliasFormat("ab").ok).toBe(false);
  });
  it("rejects reserved words", () => {
    expect(validateAliasFormat("admin").ok).toBe(false);
  });
  it("accepts a valid alias", () => {
    expect(validateAliasFormat("my-campaign_2024").ok).toBe(true);
  });
});