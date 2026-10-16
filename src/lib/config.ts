// FILE: src/lib/config.ts
export const PRODUCT_NAME = process.env.NEXT_PUBLIC_PRODUCT_NAME || "LinkNova";
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export function normalizeDomain(host: string) {
  return host.trim().toLowerCase();
}

export const DEFAULT_DOMAIN = (() => {
  try {
    return normalizeDomain(new URL(APP_URL).host);
  } catch {
    return "localhost:3000";
  }
})();

export const ANONYMOUS_SHORTENING_ENABLED =
  process.env.NEXT_PUBLIC_ANONYMOUS_SHORTENING !== "false";

export type PlanId = "FREE" | "PRO" | "BUSINESS";

export interface PlanConfig {
  id: PlanId;
  name: string;
  priceMonthly: number;
  maxLinks: number; // -1 = unlimited
  maxCustomDomains: number;
  customAliases: boolean;
  passwordProtection: boolean;
  linkExpiration: boolean;
  advancedAnalytics: boolean;
  csvExport: boolean;
  teamWorkspaces: boolean;
}

export const PLANS: Record<PlanId, PlanConfig> = {
  FREE: {
    id: "FREE", name: "Free", priceMonthly: 0,
    maxLinks: 50, maxCustomDomains: 0,
    customAliases: false, passwordProtection: false, linkExpiration: false,
    advancedAnalytics: false, csvExport: false, teamWorkspaces: false,
  },
  PRO: {
    id: "PRO", name: "Pro", priceMonthly: 12,
    maxLinks: 1000, maxCustomDomains: 1,
    customAliases: true, passwordProtection: true, linkExpiration: true,
    advancedAnalytics: true, csvExport: true, teamWorkspaces: false,
  },
  BUSINESS: {
    id: "BUSINESS", name: "Business", priceMonthly: 49,
    maxLinks: -1, maxCustomDomains: 5,
    customAliases: true, passwordProtection: true, linkExpiration: true,
    advancedAnalytics: true, csvExport: true, teamWorkspaces: true,
  },
};

export const ANONYMOUS_LINK_LIMIT_PER_DAY = 10;