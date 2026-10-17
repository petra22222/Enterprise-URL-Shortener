export const DEFAULT_DOMAIN =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.APP_URL ||
  "http://localhost:3000";

export function normalizeDomain(rawDomain: string): string {
  const input = rawDomain.trim();

  if (!input) {
    throw new Error("Application domain is required.");
  }

  const withProtocol = /^[a-z][a-z\d+.-]*:\/\//i.test(input)
    ? input
    : `https://${input}`;

  const parsed = new URL(withProtocol);

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Only HTTP and HTTPS are allowed.");
  }

  if (!parsed.hostname || parsed.username || parsed.password) {
    throw new Error("Invalid application domain.");
  }

  return parsed.origin;
}