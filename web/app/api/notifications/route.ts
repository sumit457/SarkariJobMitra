import { NextResponse } from "next/server";

import { prisma } from "@/src/lib/prisma";

export const runtime = "nodejs";

const NOTICE_SOURCE_KEYS_BY_AGENCY = {
  SSC: ["ssc_gov_noticeboard"],
  SBI: ["sbi_current_openings"],
  UPSC: ["upsc_active_exams", "upsc_forthcoming_exams", "upsc_exam_calendar"],
  "INDIA POST": ["indiapost_vacancies", "indiapost_gds"],
} as const;

const ALL_NOTICE_SOURCE_KEYS = Array.from(
  new Set(Object.values(NOTICE_SOURCE_KEYS_BY_AGENCY).flat()),
);

function agencyFromSourceKey(sourceKey: string) {
  if (sourceKey.startsWith("ssc_")) return "SSC";
  if (sourceKey.startsWith("sbi_")) return "SBI";
  if (sourceKey.startsWith("upsc_")) return "UPSC";
  if (sourceKey.startsWith("indiapost_")) return "India Post";
  return "Other";
}

function asYear(dateValue?: Date | null) {
  if (!dateValue) return null;
  const dt = new Date(dateValue);
  return Number.isNaN(dt.getTime()) ? null : dt.getUTCFullYear();
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const take = Math.min(Math.max(Number(searchParams.get("limit") ?? "50"), 1), 200);
  const skip = Math.max(Number(searchParams.get("offset") ?? "0"), 0);
  const agencyFilter = (searchParams.get("agency") ?? "").trim().toUpperCase();
  const yearFilter = Number(searchParams.get("year") ?? "0") || null;

  const agencySourceKeys = (NOTICE_SOURCE_KEYS_BY_AGENCY as Record<string, readonly string[]>)[agencyFilter];
  const sourceFilter = agencySourceKeys
    ? { key: { in: [...agencySourceKeys] } }
    : { key: { in: ALL_NOTICE_SOURCE_KEYS } };

  const rows = await prisma.rawNotification.findMany({
    where: {
      source: sourceFilter,
    },
    orderBy: [{ fetchedAt: "desc" }],
    include: { source: true },
  });

  const rowsWithAgency = rows.map((row) => {
    const agency = agencyFromSourceKey(row.source.key);
    const effectiveDate = row.publishedOn ?? row.fetchedAt;
    return {
      row,
      agency,
      effectiveDate,
      effectiveYear: asYear(effectiveDate),
    };
  });

  const filtered = rowsWithAgency.filter((entry) => {
    if (agencyFilter && entry.agency.toUpperCase() !== agencyFilter) return false;
    if (yearFilter && entry.effectiveYear !== yearFilter) return false;
    return true;
  });

  const paged = filtered.slice(skip, skip + take);

  const agencyCounts = rowsWithAgency.reduce<Record<string, number>>((acc, entry) => {
    if (yearFilter && entry.effectiveYear !== yearFilter) return acc;
    acc[entry.agency] = (acc[entry.agency] ?? 0) + 1;
    return acc;
  }, {});

  const agencies = Object.entries(agencyCounts)
    .map(([agency, count]) => ({ agency, count }))
    .sort((a, b) => b.count - a.count || a.agency.localeCompare(b.agency));

  const payload = paged.map(({ row, agency }) => ({
    id: row.id,
    agency,
    sourceKey: row.source.key,
    sourceName: row.source.name,
    examId: row.examId,
    title: row.title,
    publishedOn: row.publishedOn,
    sourceSession: row.sourceSession,
    sourceOpenDate: row.sourceOpenDate,
    sourceCloseDate: row.sourceCloseDate,
    detailUrl: row.detailUrl,
    pdfUrl: row.pdfUrl,
    applyUrl: row.applyUrl,
    officialPageUrl: row.officialPageUrl,
    pdfSha256: row.pdfSha256,
    pdfBytes: row.pdfBytes,
    storagePath: row.storagePath,
    pdfTextExtracted: row.pdfTextExtracted,
    fetchedAt: row.fetchedAt,
    status: row.status,
    error: row.error,
  }));

  return NextResponse.json({
    total: filtered.length,
    limit: take,
    offset: skip,
    year: yearFilter,
    agency: agencyFilter || null,
    agencies,
    items: payload,
  });
}
