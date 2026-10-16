// FILE: src/lib/reputation.ts
// Optional, best-effort malicious URL screening via Google Safe Browsing.
// Disabled unless SAFE_BROWSING_API_KEY is configured. This is NOT a
// guarantee of safety — it is a supplementary check, paired with user
// abuse reporting as the primary mitigation.
export async function checkUrlReputation(url: string): Promise<{ flagged: boolean; reason?: string }> {
  const apiKey = process.env.SAFE_BROWSING_API_KEY;
  if (!apiKey) return { flagged: false };

  try {
    const res = await fetch(
      `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client: { clientId: "linknova", clientVersion: "1.0.0" },
          threatInfo: {
            threatTypes: ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE"],
            platformTypes: ["ANY_PLATFORM"],
            threatEntryTypes: ["URL"],
            threatEntries: [{ url }],
          },
        }),
        signal: AbortSignal.timeout(2500),
      }
    );
    if (!res.ok) return { flagged: false };
    const data = await res.json();
    if (data?.matches?.length) {
      return { flagged: true, reason: "Flagged by Google Safe Browsing." };
    }
    return { flagged: false };
  } catch {
    // Fail open: never block link creation because a third-party check timed out.
    return { flagged: false };
  }
}