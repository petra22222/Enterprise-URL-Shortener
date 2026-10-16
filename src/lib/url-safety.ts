// FILE: src/lib/url-safety.ts
const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

export function validateAndNormalizeUrl(
  raw: string,
  appHost: string
): { ok: true; url: string; hostname: string } | { ok: false; error: string } {
  const input = raw.trim();

  if (!input) return { ok: false, error: "Please enter a URL." };
  if (input.length > 2048) return { ok: false, error: "URL is too long (max 2048 characters)." };
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f]/.test(input)) return { ok: false, error: "URL contains invalid control characters." };

  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    return { ok: false, error: "Enter a valid URL including http:// or https://" };
  }

  const protocol = parsed.protocol.toLowerCase();
  if (!ALLOWED_PROTOCOLS.has(protocol)) {
    return { ok: false, error: "Only http and https URLs are allowed." };
  }

  const hostname = parsed.hostname.toLowerCase();
  if (!hostname) return { ok: false, error: "URL must include a valid host." };

  const normalizedAppHost = appHost.split(":")[0].toLowerCase();
  if (
    hostname === normalizedAppHost ||
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0"
  ) {
    return { ok: false, error: "You can't shorten a link that points back to this service." };
  }

  return { ok: true, url: parsed.toString(), hostname };
}