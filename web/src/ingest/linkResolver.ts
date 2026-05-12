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

function shouldShowApplyLink(titleRaw: string) {
  const lower = titleRaw.toLowerCase();
  if (/(result|merit|selected|selection list|provisional list|declaration|cut[-\s]?off|answer key|list of|tainted|pending results?)/i.test(lower)) {
    return false;
  }
  return /(apply|application|recruit|vacanc|engagement|exam|notification|gds|opening)/i.test(lower);
}

function looksLikeDirectDocumentUrl(url: string) {
  return /\.pdf(?:[/?]|$)/i.test(url);
}

function pushNotificationLink(
  links: ResolvedJobLink[],
  params: {
    notificationPdfUrl?: string | null;
    officialPageUrl?: string | null;
  },
) {
  const normalized = params.notificationPdfUrl ? normalizeHttpUrl(params.notificationPdfUrl) : null;
  const trustedDirectDocument = normalized && isOfficialUrl(normalized) && looksLikeDirectDocumentUrl(normalized);

  if (trustedDirectDocument) {
    links.push({
      kind: "notification",
      label: "Download Notification",
      url: normalized,
      isPrimary: true,
    });
    return;
  }

  const officialPage = params.officialPageUrl ? normalizeHttpUrl(params.officialPageUrl) : null;
  if (!officialPage || !isOfficialUrl(officialPage)) return;
  links.push({
    kind: "notification",
    label: "View Official Notice",
    url: officialPage,
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
  officialPageUrl?: string | null;
}) {
  const links: ResolvedJobLink[] = [];

  pushNotificationLink(links, {
    notificationPdfUrl: params.notificationPdfUrl,
    officialPageUrl: params.officialPageUrl ?? params.detailUrl,
  });

  const urlsFromPdf = params.pdfText ? extractUrlsFromText(params.pdfText) : [];
  const directCandidates = filterOfficialUrls([
    params.applyUrl ?? "",
    params.detailUrl ?? "",
    ...urlsFromPdf,
  ]);

  const correctionCandidate = firstMatching(directCandidates, /(correction|edit|modify)/i);
  const nonPdfCandidates = directCandidates.filter((candidate) => !/\.pdf(?:[/?]|$)/i.test(candidate));
  const allowApplyLink = shouldShowApplyLink(params.titleRaw);

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

    if (allowApplyLink && applyLandingUrl) {
      links.push({
        kind: "apply",
        label: "Apply Online",
        url: applyLandingUrl,
        isPrimary: true,
      });
    }

    if (allowApplyLink && applyLoginUrl) {
      links.push({
        kind: "apply_login",
        label: "Candidate Login",
        url: applyLoginUrl,
        isPrimary: false,
      });
    }
  } else if (/upsc/i.test(params.organization)) {
    const upscApplyCandidate =
      firstMatching(nonPdfCandidates, /upsconline\.nic\.in/i) ||
      firstMatching(nonPdfCandidates, /upsc\.gov\.in\/.*(apply|online|otrp|ora|recruitment|candidate|registration)/i) ||
      (isOfficialUrl(params.applyUrl) ? String(normalizeHttpUrl(String(params.applyUrl))) : undefined);

    if (upscApplyCandidate) {
      links.push({
        kind: "apply",
        label: "Apply Online",
        url: upscApplyCandidate,
        isPrimary: true,
      });
    }
  } else if (/sbi/i.test(params.organization)) {
    const sbiApplyCandidate =
      firstMatching(nonPdfCandidates, /recruitment\.sbi\.bank\.in/i) ||
      firstMatching(nonPdfCandidates, /ibpsreg\.ibps\.in|ibpsonline\.ibps\.in/i) ||
      firstMatching(nonPdfCandidates, /sbi\.bank\.in\/.*(apply|careers|current-openings)/i) ||
      (isOfficialUrl(params.applyUrl) ? String(normalizeHttpUrl(String(params.applyUrl))) : undefined);

    if (sbiApplyCandidate) {
      links.push({
        kind: "apply",
        label: "Apply Online",
        url: sbiApplyCandidate,
        isPrimary: true,
      });
    }
  } else {
    const applyCandidate =
      firstMatching(
        nonPdfCandidates,
        /(ssc\.nic\.in|ssc\.gov\.in|upsc\.gov\.in|upsconline\.nic\.in).*(apply|candidate|application|portal|login|registration|online)/i,
      ) ||
      firstMatching(nonPdfCandidates, /(apply|candidate|application|portal|login|registration|online)/i) ||
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
