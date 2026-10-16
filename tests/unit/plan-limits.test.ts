// FILE: tests/unit/plan-limits.test.ts
import { describe, it, expect } from "vitest";
import { isWithinLinkLimit } from "../../src/lib/plan-limits";
import { PLANS } from "../../src/lib/config";

describe("plan limits", () => {
  it("free plan blocks creation at the limit", () => {
    expect(isWithinLinkLimit(PLANS.FREE, 50)).toBe(false);
    expect(isWithinLinkLimit(PLANS.FREE, 49)).toBe(true);
  });
  it("business plan is unlimited", () => {
    expect(isWithinLinkLimit(PLANS.BUSINESS, 999999)).toBe(true);
  });
});