export function isWithinDomainLimit(plan: any, domainCount: number): boolean {
  // প্ল্যান অনুযায়ী লিমিট নির্ধারণ (যেমন: ফ্রি প্ল্যানে ৫টি ডোমেইন)
  const MAX_DOMAINS = 5;
  return domainCount < MAX_DOMAINS;
}

export function isWithinLinkLimit(plan: any, linkCount: number): boolean {
  const MAX_LINKS = 100;
  return linkCount < MAX_LINKS;
}