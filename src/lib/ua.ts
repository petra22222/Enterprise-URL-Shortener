// FILE: src/lib/ua.ts
// Lightweight, best-effort user-agent parsing (no external dependency).
// This intentionally does not invent data it can't determine.
export function parseUserAgent(ua: string | null) {
  if (!ua) return { browser: null, os: null, deviceType: null, isBot: false };

  const isBot = /bot|crawler|spider|facebookexternalhit|slackbot|whatsapp|telegrambot|bingpreview/i.test(ua);

  let deviceType: string | null = "Desktop";
  if (/ipad|tablet/i.test(ua)) deviceType = "Tablet";
  else if (/mobile|iphone|android/i.test(ua)) deviceType = "Mobile";

  let os: string | null = null;
  if (/windows/i.test(ua)) os = "Windows";
  else if (/mac os x|macintosh/i.test(ua)) os = "macOS";
  else if (/android/i.test(ua)) os = "Android";
  else if (/iphone|ipad|ios/i.test(ua)) os = "iOS";
  else if (/linux/i.test(ua)) os = "Linux";

  let browser: string | null = null;
  if (/edg\//i.test(ua)) browser = "Edge";
  else if (/chrome\//i.test(ua) && !/edg\//i.test(ua)) browser = "Chrome";
  else if (/firefox\//i.test(ua)) browser = "Firefox";
  else if (/safari\//i.test(ua) && !/chrome\//i.test(ua)) browser = "Safari";

  return { browser, os, deviceType, isBot };
}