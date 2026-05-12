import { NextResponse } from "next/server";

import { prisma } from "@/src/lib/prisma";
import { extractJobDetailsFromPdfText } from "@/src/ingest/detailsExtractor";
import { JOB_DOC_TYPES, type JobDocType } from "@/src/ingest/extractionTypes";
import { shouldExposeRecruitmentFields } from "@/src/ingest/noticeClassifier";

export const runtime = "nodejs";

const SSC_NOTICE_SOURCE_KEYS = ["ssc_gov_noticeboard"] as const;

function coerceJobDocType(value?: string | null): JobDocType | undefined {
  return JOB_DOC_TYPES.includes(value as JobDocType) ? (value as JobDocType) : undefined;
}

function noticeUpdateTypes(title: string) {
  const lower = title.toLowerCase();
  const tags: string[] = [];
  if (/vacanc/.test(lower)) tags.push("vacancies");
  if (/date|schedule|reschedul|postpon|defer|extend/.test(lower)) tags.push("dates");
  if (/eligib|criteria|age|fee|syllabus|pattern/.test(lower)) tags.push("eligibility");
  if (tags.length === 0) tags.push("notice");
  return tags;
}

type Context = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: Request, context: Context) {
  const { slug } = await context.params;

  let row = await prisma.job.findUnique({
    where: { slug },
    include: {
      details: true,
      links: {
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
      },
      sourceNotification: {
        include: { source: true },
      },
    },
  });

  if (!row) {
    row = await prisma.job.findUnique({
      where: { id: slug },
      include: {
        details: true,
        links: {
          orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        },
        sourceNotification: {
          include: { source: true },
        },
      },
    });
  }

  if (!row) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  let latestUpdateNotice: {
    title: string;
    pdfUrl: string | null;
    detailUrl: string | null;
    publishedOn: Date | null;
    fetchedAt: Date;
    updateTypes: string[];
  } | null = null;

  if (row.sourceNotification.examId) {
    const latestNotice = await prisma.rawNotification.findFirst({
      where: {
        examId: row.sourceNotification.examId,
        source: {
          key: {
            in: [...SSC_NOTICE_SOURCE_KEYS],
          },
        },
      },
      orderBy: [{ fetchedAt: "desc" }],
    });

    if (latestNotice) {
      latestUpdateNotice = {
        title: latestNotice.title,
        pdfUrl: latestNotice.pdfUrl,
        detailUrl: latestNotice.detailUrl,
        publishedOn: latestNotice.publishedOn,
        fetchedAt: latestNotice.fetchedAt,
        updateTypes: noticeUpdateTypes(latestNotice.title),
      };
    }
  }

  const parsedPdfDetails = row.sourceNotification.pdfText
    ? extractJobDetailsFromPdfText(row.organization, row.sourceNotification.pdfText)
    : undefined;
  const structuredFallback = row.organization === "SBI" ? undefined : parsedPdfDetails;
  const primaryNotificationUrl =
    row.links.find((link) => link.kind === "notification" && link.isPrimary)?.url ??
    row.links.find((link) => link.kind === "notification")?.url ??
    row.notificationPdfUrl ??
    row.officialNotificationUrl;
  const showRecruitmentFields = shouldExposeRecruitmentFields(
    row.titleRaw,
    row.category,
    coerceJobDocType(row.details?.docType),
  );

  const mergedDetails = {
    applyBegin: showRecruitmentFields ? row.details?.applyBegin ?? parsedPdfDetails?.applyBegin ?? null : null,
    applyLastDate: showRecruitmentFields ? row.details?.applyLastDate ?? parsedPdfDetails?.applyLastDate ?? null : null,
    examDate: row.details?.examDate ?? parsedPdfDetails?.examDate ?? null,
    feeLastDate: showRecruitmentFields ? row.details?.feeLastDate ?? parsedPdfDetails?.feeLastDate ?? null : null,
    correctionFrom: showRecruitmentFields ? row.details?.correctionFrom ?? parsedPdfDetails?.correctionFrom ?? null : null,
    correctionTo: showRecruitmentFields ? row.details?.correctionTo ?? parsedPdfDetails?.correctionTo ?? null : null,
    feeGeneral: showRecruitmentFields ? row.details?.feeGeneral ?? parsedPdfDetails?.feeGeneral ?? null : null,
    feeObc: showRecruitmentFields ? row.details?.feeObc ?? parsedPdfDetails?.feeObc ?? null : null,
    feeScSt: showRecruitmentFields ? row.details?.feeScSt ?? parsedPdfDetails?.feeScSt ?? null : null,
    feePh: showRecruitmentFields ? row.details?.feePh ?? parsedPdfDetails?.feePh ?? null : null,
    feeFemale: showRecruitmentFields ? row.details?.feeFemale ?? parsedPdfDetails?.feeFemale ?? null : null,
    feeNote: showRecruitmentFields ? row.details?.feeNote ?? parsedPdfDetails?.feeNote ?? null : null,
    ageMin: showRecruitmentFields ? row.details?.ageMin ?? parsedPdfDetails?.ageMin ?? null : null,
    ageMax: showRecruitmentFields ? row.details?.ageMax ?? parsedPdfDetails?.ageMax ?? null : null,
    ageAsOn: showRecruitmentFields ? row.details?.ageAsOn ?? parsedPdfDetails?.ageAsOn ?? null : null,
    vacancyTotal: showRecruitmentFields ? row.details?.vacancyTotal ?? parsedPdfDetails?.vacancyTotal ?? row.vacancies ?? null : null,
    shortSummary: row.details?.shortSummary ?? parsedPdfDetails?.shortSummary ?? row.shortSummary ?? null,
    positionName: showRecruitmentFields ? row.details?.positionName ?? structuredFallback?.positionName ?? null : null,
    department: showRecruitmentFields ? row.details?.department ?? structuredFallback?.department ?? null : null,
    placeOfPosting: showRecruitmentFields ? row.details?.placeOfPosting ?? structuredFallback?.placeOfPosting ?? null : null,
    qualification: showRecruitmentFields ? row.details?.qualification ?? structuredFallback?.qualification ?? null : null,
    payScale: showRecruitmentFields ? row.details?.payScale ?? structuredFallback?.payScale ?? null : null,
    examCentres: showRecruitmentFields ? row.details?.examCentres ?? structuredFallback?.examCentres ?? null : null,
    categoryVacancy: showRecruitmentFields ? row.details?.categoryVacancy ?? structuredFallback?.categoryVacancy ?? null : null,
  };

  return NextResponse.json({
    slug: row.slug,
    organization: row.organization,
    examName: row.examName,
    titleRaw: row.titleRaw,
    notificationPdfUrl: primaryNotificationUrl,
    links: row.links.map((link) => ({
      kind: link.kind,
      label: link.label,
      url: link.url,
      isPrimary: link.isPrimary,
    })),
    details: mergedDetails,
    source: {
      sourceKey: row.sourceNotification.source.key,
      sourceName: row.sourceNotification.source.name,
      publishedOn: row.publishedOn,
      fetchedAt: row.sourceNotification.fetchedAt,
      pdfSha256: row.sourceNotification.pdfSha256,
      examId: row.sourceNotification.examId,
      sourceSession: row.sourceNotification.sourceSession,
      sourceOpenDate: row.sourceNotification.sourceOpenDate,
      sourceCloseDate: row.sourceNotification.sourceCloseDate,
    },
    hasUpdates: Boolean(latestUpdateNotice),
    latestUpdateNotice,
  });
}
