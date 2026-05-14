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
  "ibps.in",
  "rbi.org.in",
  "nabard.org",
  "rrbapply.gov.in",
  "rrbcdg.gov.in",
  "joinindianarmy.nic.in",
  "joinindiannavy.gov.in",
  "afcat.cdac.in",
  "agnipathvayu.cdac.in",
  "rectt.bsf.gov.in",
  "rect.crpf.gov.in",
  "cisfrectt.cisf.gov.in",
  "recruitment.itbpolice.nic.in",
  "recruitment.nta.nic.in",
  "kvsangathan.nic.in",
  "navodaya.gov.in",
  "aiimsexams.ac.in",
  "esic.gov.in",
  "apprenticeshipindia.gov.in",
  "nats.education.gov.in",
  "ongcindia.com",
  "iocl.com",
  "careers.bhel.in",
  "sailcareers.com",
  "careers.ntpc.co.in",
  "coalindia.in",
  "sci.gov.in",
  "allahabadhighcourt.in",
  "patnahighcourt.gov.in",
  "uppsc.up.nic.in",
  "upsssc.gov.in",
  "uppbpb.gov.in",
  "upbasiceduboard.gov.in",
  "bpsc.bihar.gov.in",
  "csbc.bihar.gov.in",
  "btsc.bihar.gov.in",
  "bssc.bihar.gov.in",
  "jpsc.gov.in",
  "jssc.jharkhand.gov.in",
  "rpsc.rajasthan.gov.in",
  "rssb.rajasthan.gov.in",
  "hpsc.gov.in",
  "hssc.gov.in",
  "psc.uk.gov.in",
  "sssc.uk.gov.in",
  "hppsc.hp.gov.in",
  "jkssb.nic.in",
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
  const domainPattern = OFFICIAL_DOMAINS.map((domain) => domain.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const bareOfficialMatches =
    text.match(new RegExp(`\\b(?:https?:\\/\\/)?(?:www\\.)?(?:${domainPattern})(?:\\/[^\\s"'<>]*)?`, "gi")) ?? [];

  const normalizedCandidates = [...strictMatches, ...bareOfficialMatches].map((candidate) => {
    if (/^https?:\/\//i.test(candidate)) return candidate;
    return `https://${candidate.replace(/^\/+/, "")}`;
  });

  return filterOfficialUrls(normalizedCandidates);
}

export function officialDomainsAllowlist() {
  return [...OFFICIAL_DOMAINS];
}
