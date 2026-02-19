import { extractUrlsFromText, filterOfficialUrls, isOfficialUrl, normalizeHttpUrl } from "./officialDomains";

export type ResolvedJobLink = {
  kind: string;
  label: string;
  url: string;
  isPrimary: boolean;
};

function dedupeLinks(links: ResolvedJobLink[]) {
  const seen = new Set<string>();
  return links.filter((link) => {
    const key = `${link.kind}::${link.url}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function firstMatching(urls: string[], pattern: RegExp) {
  return urls.find((url) => pattern.test(url));
}

function pushNotificationLink(links: ResolvedJobLink[], notificationPdfUrl?: string | null) {
  const normalized = notificationPdfUrl ? normalizeHttpUrl(notificationPdfUrl) : null;
  if (!normalized || !isOfficialUrl(normalized)) return;

  links.push({
    kind: "notification",
    label: "Download Notification",
    url: normalized,
    isPrimary: true,
  });
}

export function resolveJobLinks(params: {
  organization: string;
  titleRaw: string;
  pdfText?: string | null;
  notificationPdfUrl?: string | null;
  applyUrl?: string | null;
  detailUrl?: string | null;
}) {
  const links: ResolvedJobLink[] = [];

  pushNotificationLink(links, params.notificationPdfUrl);

  const urlsFromPdf = params.pdfText ? extractUrlsFromText(params.pdfText) : [];
  const directCandidates = filterOfficialUrls([
    params.applyUrl ?? "",
    params.detailUrl ?? "",
    ...urlsFromPdf,
  ]);

  const correctionCandidate = firstMatching(directCandidates, /(correction|edit|modify)/i);

  if (/india\s*post/i.test(params.organization)) {
    const landingFromPdf = firstMatching(directCandidates, /indiapost\.gov\.in\/gdsonlineengagement(?!.*gdscandidate)/i);
    const loginFromPdf = firstMatching(directCandidates, /app\.indiapost\.gov\.in\/gdscandidate/i);

    const applyLandingUrl =
      landingFromPdf ||
      (isOfficialUrl(params.applyUrl) && /gdsonlineengagement/i.test(String(params.applyUrl))
        ? String(normalizeHttpUrl(String(params.applyUrl)))
        : "https://www.indiapost.gov.in/gdsonlineengagement");

    const applyLoginUrl =
      loginFromPdf ||
      (isOfficialUrl(params.applyUrl) && /gdscandidate/i.test(String(params.applyUrl))
        ? String(normalizeHttpUrl(String(params.applyUrl)))
        : undefined);

    if (applyLandingUrl) {
      links.push({
        kind: "apply",
        label: "Apply Online",
        url: applyLandingUrl,
        isPrimary: true,
      });
    }

    if (applyLoginUrl) {
      links.push({
        kind: "apply_login",
        label: "Candidate Login",
        url: applyLoginUrl,
        isPrimary: false,
      });
    }
  } else {
    const applyCandidate =
      firstMatching(directCandidates, /(ssc\.nic\.in|ssc\.gov\.in).*(apply|candidate|application|portal|login)/i) ||
      (isOfficialUrl(params.applyUrl) ? String(normalizeHttpUrl(String(params.applyUrl))) : undefined);

    if (applyCandidate) {
      links.push({
        kind: "apply",
        label: "Apply Online",
        url: applyCandidate,
        isPrimary: true,
      });
    }
  }

  if (correctionCandidate) {
    links.push({
      kind: "correction",
      label: "Correction / Edit",
      url: correctionCandidate,
      isPrimary: false,
    });
  }

  return dedupeLinks(links);
}
