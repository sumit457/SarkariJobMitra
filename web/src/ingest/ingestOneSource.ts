import axios from "axios";
import crypto from "crypto";
import * as cheerio from "cheerio";
import pLimit from "p-limit";

import { prisma } from "@/src/lib/prisma";

import { downloadBinary, fetchTextWithOptionalFallback } from "./http";
import { parseIndiaPostGds } from "./parsers/indiaPostGds";
import { parseIndiaPostVacancies } from "./parsers/indiaPostVacancies";
import {
  parseSscGovCalendarApiPayload,
  parseSscGovNoticeBoard,
  parseSscGovNoticeBoardApiPayload,
  SSC_GOV_CALENDAR_API_URL,
  SSC_GOV_NOTICE_API_URL,
} from "./parsers/sscGov";
import { parseSscNicNotices } from "./parsers/sscNic";
import { parseSbiCurrentOpenings } from "./parsers/sbi";
import { parseUpscActiveExams, parseUpscExamCalendar, parseUpscForthcomingExams } from "./parsers/upsc";
import { savePdf } from "./storage";
import type { ParsedNotificationItem } from "./types";

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function sourceTimeoutMs(sourceKey: string) {
  const bySource = process.env[`INGEST_TIMEOUT_${sourceKey.toUpperCase()}_MS`];
  if (bySource && Number.isFinite(Number(bySource)) && Number(bySource) > 0) {
    return Number(bySource);
  }

  const byGroup = sourceKey.startsWith("ssc_")
    ? process.env.INGEST_TIMEOUT_SSC_MS
    : sourceKey.startsWith("sbi_")
      ? process.env.INGEST_TIMEOUT_SBI_MS
    : sourceKey.startsWith("upsc_")
      ? process.env.INGEST_TIMEOUT_UPSC_MS
      : sourceKey.startsWith("indiapost_")
        ? process.env.INGEST_TIMEOUT_INDIAPOST_MS
        : undefined;
  if (byGroup && Number.isFinite(Number(byGroup)) && Number(byGroup) > 0) {
    return Number(byGroup);
  }

  const fallback = Number(process.env.REQUEST_TIMEOUT_MS ?? 25000);
  return Number.isFinite(fallback) && fallback > 0 ? fallback : 25000;
}

function canonicalKey(parts: Record<string, string | undefined | null>) {
  const raw = JSON.stringify(parts);
  return crypto.createHash("sha256").update(raw).digest("hex");
}

function parseItemsBySource(sourceKey: string, html: string, baseUrl: string) {
  if (sourceKey === "ssc_nic_notices") return parseSscNicNotices(html, baseUrl);
  if (sourceKey === "ssc_gov_noticeboard") return parseSscGovNoticeBoard(html, baseUrl);
  if (sourceKey === "indiapost_vacancies") return parseIndiaPostVacancies(html, baseUrl);
  if (sourceKey === "indiapost_gds") return parseIndiaPostGds(html, baseUrl);
  if (sourceKey === "upsc_active_exams") return parseUpscActiveExams(html, baseUrl);
  if (sourceKey === "upsc_forthcoming_exams") return parseUpscForthcomingExams(html, baseUrl);
  if (sourceKey === "upsc_exam_calendar") return parseUpscExamCalendar(html, baseUrl);
  if (sourceKey === "sbi_current_openings") return parseSbiCurrentOpenings(html, baseUrl);
  return [];
}

function abs(base: string, href?: string | null) {
  if (!href) return null;
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}

function extractLinksFromDetail(html: string, detailUrl: string, sourceKey: string) {
  const $ = cheerio.load(html);
  const pdfCandidates: string[] = [];
  let applyUrl: string | undefined;

  $("a").each((_, a) => {
    const href = $(a).attr("href");
    const text = $(a).text().trim().replace(/\s+/g, " ");
    const url = abs(detailUrl, href);

    if (!url) return;

    if (/\.pdf(?:[/?]|$)/i.test(url)) {
      pdfCandidates.push(url);
    }

    if (!applyUrl && /apply|register|online/i.test(text)) {
      applyUrl = url;
    }
  });

  let pdfUrl = pdfCandidates[0];

  if (sourceKey === "ssc_nic_notices") {
    const preferred = pdfCandidates.find((candidate) => {
      try {
        return new URL(candidate).hostname.includes("ssc.nic.in");
      } catch {
        return false;
      }
    });

    if (preferred) pdfUrl = preferred;
  }

  return {
    pdfUrl,
    applyUrl,
  };
}

async function resolveDetailPages(sourceKey: string, items: ParsedNotificationItem[]) {
  if (sourceKey === "ssc_gov_calendar") return items;

  const limit = pLimit(2);
  const timeoutMs = sourceTimeoutMs(sourceKey);

  const resolved = await Promise.all(
    items.map((item) =>
      limit(async () => {
        if (item.pdfUrl || !item.detailUrl) return item;

        try {
          const detail = await fetchTextWithOptionalFallback(item.detailUrl, { timeoutMs });
          if (!detail.text) return item;

          const links = extractLinksFromDetail(detail.text, item.detailUrl, sourceKey);
          return {
            ...item,
            pdfUrl: item.pdfUrl ?? links.pdfUrl,
            applyUrl: item.applyUrl ?? links.applyUrl,
          };
        } catch {
          return item;
        }
      }),
    ),
  );

  return resolved;
}

async function isAccessiblePdf(url: string) {
  try {
    const res = await axios.head(url, {
      timeout: Number(process.env.REQUEST_TIMEOUT_MS ?? 25000),
      maxRedirects: 5,
      headers: {
        "User-Agent": process.env.USER_AGENT ?? "GovJobsBot/1.0 (+contact@example.com)",
        Accept: "application/pdf,*/*",
      },
      validateStatus: (status) => status >= 200 && status < 400,
    });

    const contentType = String(res.headers["content-type"] ?? "").toLowerCase();
    return contentType.includes("pdf");
  } catch {
    return false;
  }
}

async function applySourceSpecificFallbacks(sourceKey: string, items: ParsedNotificationItem[]) {
  if (sourceKey !== "indiapost_gds") return items;

  const gdsCandidates = [
    "https://www.indiapost.gov.in/gdsonlineengagement/pdf/descriptive-notification.pdf",
    "https://www.indiapost.gov.in/gdsonlineengagement/pdf/descriptive-notification-hindi.pdf",
    "https://www.indiapost.gov.in/gdsonlineengagement/pdf/Annexure-Ia.pdf",
  ];

  let selectedPdf: string | undefined;
  for (const candidate of gdsCandidates) {
    // Pick the first currently valid official PDF URL.
    if (await isAccessiblePdf(candidate)) {
      selectedPdf = candidate;
      break;
    }
  }

  return items.map((item) => ({
    ...item,
    pdfUrl: item.pdfUrl ?? selectedPdf,
  }));
}

function dedupeParsedItems(items: ParsedNotificationItem[]) {
  const seen = new Set<string>();
  return items.filter((it) => {
    const key = [
      normalizeText(it.title),
      it.detailUrl ?? "",
      it.pdfUrl ?? "",
      it.applyUrl ?? "",
      it.examId ?? "",
      it.sourceSession ?? "",
      it.sourceOpenDate?.toISOString() ?? "",
      it.sourceCloseDate?.toISOString() ?? "",
    ].join("::");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildDedupeAnchor(sourceKey: string, item: ParsedNotificationItem) {
  if (sourceKey === "indiapost_vacancies") {
    const datePart = item.publishedOn ? item.publishedOn.toISOString().slice(0, 10) : "";
    return `${normalizeText(item.title)}::${datePart}`;
  }

  if (sourceKey === "indiapost_gds") {
    return normalizeText(item.title);
  }

  if (sourceKey === "ssc_gov_calendar") {
    return [
      item.examId ?? "",
      normalizeText(item.title),
      item.sourceSession ?? "",
    ].join("::");
  }

  return item.detailUrl ?? item.pdfUrl ?? normalizeText(item.title);
}

export async function ingestSource(sourceKey: string) {
  const source = await prisma.source.findUnique({ where: { key: sourceKey } });
  if (!source || !source.isActive) return { ok: true, skipped: true };

  const bypassListingCache = source.key === "ssc_gov_noticeboard" || source.key === "ssc_gov_calendar";
  const timeoutMs = sourceTimeoutMs(source.key);

  const res = await fetchTextWithOptionalFallback(source.listingUrl, {
    etag: source.etag ?? undefined,
    timeoutMs,
  });

  if (!bypassListingCache && res.status === 304) {
    await prisma.source.update({
      where: { id: source.id },
      data: { lastCheckedAt: new Date() },
    });
    return { ok: true, notModified: true };
  }

  if (!bypassListingCache && res.hash && source.lastHash && res.hash === source.lastHash) {
    await prisma.source.update({
      where: { id: source.id },
      data: { lastCheckedAt: new Date(), etag: res.etag ?? source.etag },
    });
    return { ok: true, unchanged: true };
  }

  const parsedFromListing = res.text ? parseItemsBySource(source.key, res.text, source.listingUrl) : [];

  let parsedFromApi: ParsedNotificationItem[] = [];
  let apiHash: string | undefined;

  if (source.key === "ssc_gov_noticeboard") {
    try {
      const apiRes = await fetchTextWithOptionalFallback(SSC_GOV_NOTICE_API_URL, { timeoutMs });
      apiHash = apiRes.hash;
      if (apiRes.text) {
        parsedFromApi = parseSscGovNoticeBoardApiPayload(apiRes.text);
      }
    } catch {
      // Keep ingestion resilient: HTML parse fallback is still available.
    }
  }

  if (source.key === "ssc_gov_calendar") {
    try {
      const apiRes = await fetchTextWithOptionalFallback(SSC_GOV_CALENDAR_API_URL, { timeoutMs });
      apiHash = apiRes.hash;
      if (apiRes.text) {
        parsedFromApi = parseSscGovCalendarApiPayload(apiRes.text);
      }
    } catch {
      // Keep ingestion resilient: the listing page hash still updates source heartbeat.
    }
  }

  const parsed = [...parsedFromListing, ...parsedFromApi];
  const resolvedItems = await resolveDetailPages(source.key, parsed);
  const sourceAdjustedItems = await applySourceSpecificFallbacks(source.key, resolvedItems);
  const items = dedupeParsedItems(sourceAdjustedItems);

  const created: string[] = [];
  const updated: string[] = [];

  for (const item of items) {
    const dedupeAnchor = buildDedupeAnchor(source.key, item);
    const key = canonicalKey({
      source: source.key,
      anchor: dedupeAnchor,
    });

    const existing = await prisma.rawNotification.findUnique({
      where: { canonicalKey: key },
    });

    if (existing) {
      const updateData: {
        pdfUrl?: string;
        applyUrl?: string;
        detailUrl?: string;
        publishedOn?: Date;
        examId?: string;
        sourceOpenDate?: Date;
        sourceCloseDate?: Date;
        sourceSession?: string;
        officialPageUrl?: string;
      } = {};

      if (!existing.pdfUrl && item.pdfUrl) updateData.pdfUrl = item.pdfUrl;
      if (source.key === "indiapost_vacancies" && item.pdfUrl && existing.pdfUrl !== item.pdfUrl) {
        updateData.pdfUrl = item.pdfUrl;
      }
      if (source.key === "sbi_current_openings" && item.pdfUrl && existing.pdfUrl !== item.pdfUrl) {
        updateData.pdfUrl = item.pdfUrl;
      }
      if (!existing.applyUrl && item.applyUrl) updateData.applyUrl = item.applyUrl;
      if (source.key === "sbi_current_openings" && item.applyUrl && existing.applyUrl !== item.applyUrl) {
        updateData.applyUrl = item.applyUrl;
      }
      if (!existing.detailUrl && item.detailUrl) updateData.detailUrl = item.detailUrl;
      if (!existing.publishedOn && item.publishedOn) updateData.publishedOn = item.publishedOn;
      if (!existing.examId && item.examId) updateData.examId = item.examId;
      if (!existing.sourceOpenDate && item.sourceOpenDate) updateData.sourceOpenDate = item.sourceOpenDate;
      if (!existing.sourceCloseDate && item.sourceCloseDate) updateData.sourceCloseDate = item.sourceCloseDate;
      if (!existing.sourceSession && item.sourceSession) updateData.sourceSession = item.sourceSession;
      if (
        source.key === "ssc_gov_calendar" &&
        item.sourceOpenDate &&
        existing.sourceOpenDate?.getTime() !== item.sourceOpenDate.getTime()
      ) {
        updateData.sourceOpenDate = item.sourceOpenDate;
      }
      if (
        source.key === "ssc_gov_calendar" &&
        item.sourceCloseDate &&
        existing.sourceCloseDate?.getTime() !== item.sourceCloseDate.getTime()
      ) {
        updateData.sourceCloseDate = item.sourceCloseDate;
      }
      if (!existing.officialPageUrl) updateData.officialPageUrl = item.detailUrl ?? source.listingUrl;

      if (Object.keys(updateData).length > 0) {
        const shouldResetPdfState =
          typeof updateData.pdfUrl === "string" &&
          updateData.pdfUrl.length > 0 &&
          updateData.pdfUrl !== existing.pdfUrl;

        const data: {
          pdfUrl?: string;
          applyUrl?: string;
          detailUrl?: string;
          publishedOn?: Date;
          examId?: string;
          sourceOpenDate?: Date;
          sourceCloseDate?: Date;
          sourceSession?: string;
          officialPageUrl?: string;
          processedAt?: null;
          status?: string;
          pdfSha256?: null;
          pdfBytes?: null;
          storagePath?: null;
          pdfTextExtracted?: boolean;
          pdfText?: null;
          error?: null;
        } = {
          ...updateData,
          // Re-normalize rows when important source fields have changed.
          processedAt: null,
        };

        if (shouldResetPdfState) {
          data.status = "new";
          data.pdfSha256 = null;
          data.pdfBytes = null;
          data.storagePath = null;
          data.pdfTextExtracted = false;
          data.pdfText = null;
          data.error = null;
        }

        await prisma.rawNotification.update({ where: { id: existing.id }, data });
        updated.push(existing.id);
      }
      continue;
    }

    const rn = await prisma.rawNotification.create({
      data: {
        sourceId: source.id,
        title: item.title,
        examId: item.examId,
        publishedOn: item.publishedOn,
        sourceOpenDate: item.sourceOpenDate,
        sourceCloseDate: item.sourceCloseDate,
        sourceSession: item.sourceSession,
        detailUrl: item.detailUrl,
        pdfUrl: item.pdfUrl,
        applyUrl: item.applyUrl,
        officialPageUrl: item.detailUrl ?? source.listingUrl,
        canonicalKey: key,
        status: "new",
      },
    });

    created.push(rn.id);
  }

  const combinedHash =
    source.key === "ssc_gov_noticeboard" || source.key === "ssc_gov_calendar" ? apiHash ?? res.hash : res.hash;

  await prisma.source.update({
    where: { id: source.id },
    data: {
      lastCheckedAt: new Date(),
      etag: res.etag ?? source.etag,
      lastHash: combinedHash ?? source.lastHash,
    },
  });

  return {
    ok: true,
    parsedCount: items.length,
    createdCount: created.length,
    updatedCount: updated.length,
    createdIds: created,
  };
}

export async function downloadPdfForRawNotification(rawId: string) {
  const rn = await prisma.rawNotification.findUnique({
    where: { id: rawId },
  });

  if (!rn) return { ok: false, error: "not_found" };
  if (!rn.pdfUrl) return { ok: false, error: "no_pdf_url" };
  if (rn.pdfSha256 && rn.storagePath) return { ok: true, already: true };

  try {
    const { buf, sha256, bytes, finalUrl } = await downloadBinary(rn.pdfUrl);
    const { storagePath } = await savePdf({ sha256, buf });

    await prisma.rawNotification.update({
      where: { id: rn.id },
      data: {
        pdfUrl: finalUrl,
        pdfSha256: sha256,
        pdfBytes: bytes,
        storagePath,
        status: "downloaded",
        error: null,
      },
    });

    return { ok: true, pdfSha256: sha256, storagePath, bytes };
  } catch (error) {
    const message = String((error as Error)?.message ?? error);

    await prisma.rawNotification.update({
      where: { id: rn.id },
      data: {
        status: "error",
        error: message,
      },
    });

    return { ok: false, error: message };
  }
}
