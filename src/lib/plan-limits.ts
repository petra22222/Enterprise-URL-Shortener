export function isWithinDomainLimit(domainCount: number): boolean {
  // Free tier or general plan limit check (e.g., max 5 domains)
  const MAX_DOMAINS = 5;
  return domainCount < MAX_DOMAINS;
}

export function isWithinLinkLimit(linkCount: number): boolean {
  const MAX_LINKS = 100;
  return linkCount < MAX_LINKS;
}