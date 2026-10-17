// FILE: src/lib/url-safety.ts

export const DEFAULT_DOMAIN = process.env.NEXT_PUBLIC_DEFAULT_DOMAIN || "localhost:3000";

export function normalizeDomain(domain: string): string {
  if (!domain) return DEFAULT_DOMAIN;
  return domain.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export function validateAndNormalizeUrl(inputUrl: string, host?: string) {
  try {
    let urlString = inputUrl ? inputUrl.trim() : "";
    if (!urlString) {
      return { ok: false, error: "URL cannot be empty." };
    }

    if (!/^https?:\/\//i.test(urlString)) {
      urlString = "https://" + urlString;
    }

    const parsed = new URL(urlString);

    if (!["http:", "https:"].includes(parsed.protocol)) {
      return { ok: false, error: "Only HTTP and HTTPS protocols are allowed." };
    }

    return {
      ok: true,
      url: parsed.toString(),
      hostname: parsed.hostname,
    };
  } catch (err) {
    return { ok: false, error: "Invalid URL format." };
  }
}