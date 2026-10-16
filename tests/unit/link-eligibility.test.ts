// FILE: tests/unit/link-eligibility.test.ts
import { describe, it, expect } from "vitest";
import { getLinkRedirectStatus } from "../../src/lib/link-eligibility";

describe("getLinkRedirectStatus", () => {
  const base = { isActive: true, expiresAt: null, passwordHash: null };
  it("returns disabled when inactive", () => {
    expect(getLinkRedirectStatus({ ...base, isActive: false })).toBe("disabled");
  });
  it("returns expired when past expiry", () => {
    expect(getLinkRedirectStatus({ ...base, expiresAt: new Date(Date.now() - 1000) })).toBe("expired");
  });
  it("returns password_required when a hash is set", () => {
    expect(getLinkRedirectStatus({ ...base, passwordHash: "hash" })).toBe("password_required");
  });
  it("returns ok for a normal active link", () => {
    expect(getLinkRedirectStatus(base)).toBe("ok");
  });
});