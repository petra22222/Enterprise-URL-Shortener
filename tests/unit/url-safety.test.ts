// FILE: tests/unit/url-safety.test.ts
import { describe, it, expect } from "vitest";
import { validateAndNormalizeUrl } from "../../src/lib/url-safety";

describe("validateAndNormalizeUrl", () => {
  it("accepts valid https URLs", () => {
    const r = validateAndNormalizeUrl("https://example.com/path", "myapp.com");
    expect(r.ok).toBe(true);
  });
  it("rejects javascript: scheme", () => {
    const r = validateAndNormalizeUrl("javascript:alert(1)", "myapp.com");
    expect(r.ok).toBe(false);
  });
  it("rejects data: scheme", () => {
    const r = validateAndNormalizeUrl("data:text/html,<script>1</script>", "myapp.com");
    expect(r.ok).toBe(false);
  });
  it("rejects self-referential host to prevent redirect loops", () => {
    const r = validateAndNormalizeUrl("https://myapp.com/abc", "myapp.com");
    expect(r.ok).toBe(false);
  });
  it("rejects malformed URLs", () => {
    const r = validateAndNormalizeUrl("not a url", "myapp.com");
    expect(r.ok).toBe(false);
  });
});