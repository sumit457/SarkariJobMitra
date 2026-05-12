const OFFICIAL_DOMAINS = [
  "ssc.nic.in",
  "ssc.gov.in",
  "indiapost.gov.in",
  "cept.gov.in",
  "upsc.gov.in",
  "upsconline.nic.in",
  "sbi.bank.in",
  "recruitment.sbi.bank.in",
  "ibpsreg.ibps.in",
  "ibpsonline.ibps.in",
];

function cleanCandidateUrl(raw: string) {
  return raw
    .trim()
    .replace(/^[<(\[]+/, "")
    .replace(/[>),.;\]]+$/, "");
}

export function normalizeHttpUrl(raw: string) {
  const cleaned = cleanCandidateUrl(raw);
  if (!cleaned) return null;

  try {
    const parsed = new URL(cleaned);
    if (!parsed.protocol.startsWith("http")) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export function isOfficialDomainHost(hostname: string) {
  const host = hostname.toLowerCase();
  return OFFICIAL_DOMAINS.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

export function isOfficialUrl(rawUrl?: string | null) {
  if (!rawUrl) return false;
  const normalized = normalizeHttpUrl(rawUrl);
  if (!normalized) return false;

  try {
    const parsed = new URL(normalized);
    return isOfficialDomainHost(parsed.hostname);
  } catch {
    return false;
  }
}

export function filterOfficialUrls(urls: string[]) {
  const dedup = new Set<string>();
  for (const candidate of urls) {
    const normalized = normalizeHttpUrl(candidate);
    if (!normalized) continue;
    if (!isOfficialUrl(normalized)) continue;
    dedup.add(normalized);
  }
  return [...dedup];
}

export function extractUrlsFromText(text: string) {
  const strictMatches = text.match(/https?:\/\/[^\s"'<>]+/gi) ?? [];
  const bareOfficialMatches =
    text.match(
      /\b(?:https?:\/\/)?(?:www\.)?(?:ssc\.nic\.in|ssc\.gov\.in|indiapost\.gov\.in|cept\.gov\.in|upsc\.gov\.in|upsconline\.nic\.in|sbi\.bank\.in|recruitment\.sbi\.bank\.in|ibpsreg\.ibps\.in|ibpsonline\.ibps\.in)(?:\/[^\s"'<>]*)?/gi,
    ) ?? [];

  const normalizedCandidates = [...strictMatches, ...bareOfficialMatches].map((candidate) => {
    if (/^https?:\/\//i.test(candidate)) return candidate;
    return `https://${candidate.replace(/^\/+/, "")}`;
  });

  return filterOfficialUrls(normalizedCandidates);
}

export function officialDomainsAllowlist() {
  return [...OFFICIAL_DOMAINS];
}
