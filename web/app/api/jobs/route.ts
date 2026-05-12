import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/src/lib/prisma";
import { JOB_DOC_TYPES, type JobDocType } from "@/src/ingest/extractionTypes";
import { shouldExposeRecruitmentFields } from "@/src/ingest/noticeClassifier";

export const runtime = "nodejs";

const JOB_SOURCE_KEYS = [
  "ssc_gov_calendar",
  "sbi_current_openings",
  "indiapost_vacancies",
  "indiapost_gds",
  "upsc_active_exams",
  "upsc_forthcoming_exams",
  "upsc_exam_calendar",
] as const;

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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const take = Math.min(Math.max(Number(searchParams.get("limit") ?? "50"), 1), 200);
  const skip = Math.max(Number(searchParams.get("offset") ?? "0"), 0);
  const search = (searchParams.get("search") ?? "").trim().toLowerCase();
  const organization = (searchParams.get("organization") ?? "").trim();
  const state = (searchParams.get("state") ?? "").trim();
  const status = (searchParams.get("status") ?? "").trim();
  const activeOnlyRaw = (searchParams.get("activeOnly") ?? searchParams.get("active_only") ?? "").trim().toLowerCase();
  const activeOnly = ["1", "true", "yes"].includes(activeOnlyRaw);

  const where: Prisma.JobWhereInput = {
    sourceNotification: {
      source: {
        key: {
          in: [...JOB_SOURCE_KEYS],
        },
      },
    },
    ...(organization ? { organization } : {}),
    ...(state ? { state } : {}),
    ...(status
      ? { status }
      : activeOnly
        ? {
            status: {
              in: ["active", "upcoming", "unknown"],
            },
          }
        : {}),
    ...(search
      ? {
          OR: [
            { examName: { contains: search, mode: "insensitive" } },
            { titleRaw: { contains: search, mode: "insensitive" } },
            { organization: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const rows = await prisma.job.findMany({
    where,
    orderBy: [{ sourceNotification: { fetchedAt: "desc" } }, { updatedAt: "desc" }],
    skip,
    take,
    include: {
      details: true,
      links: true,
      sourceNotification: {
        include: {
          source: true,
        },
      },
    },
  });

  const sscExamIds = Array.from(
    new Set(
      rows
        .map((row) => row.sourceNotification.examId)
        .filter((value): value is string => typeof value === "string" && value.length > 0),
    ),
  );

  const latestNoticeByExamId = new Map<
    string,
    {
      title: string;
      pdfUrl: string | null;
      detailUrl: string | null;
      publishedOn: Date | null;
      fetchedAt: Date;
      updateTypes: string[];
    }
  >();

  if (sscExamIds.length > 0) {
    const notices = await prisma.rawNotification.findMany({
      where: {
        examId: { in: sscExamIds },
        source: {
          key: {
            in: [...SSC_NOTICE_SOURCE_KEYS],
          },
        },
      },
      orderBy: [{ fetchedAt: "desc" }],
      include: {
        source: true,
      },
    });

    for (const notice of notices) {
      if (!notice.examId || latestNoticeByExamId.has(notice.examId)) continue;
      latestNoticeByExamId.set(notice.examId, {
        title: notice.title,
        pdfUrl: notice.pdfUrl,
        detailUrl: notice.detailUrl,
        publishedOn: notice.publishedOn,
        fetchedAt: notice.fetchedAt,
        updateTypes: noticeUpdateTypes(notice.title),
      });
    }
  }

  const payload = rows.map((row) => {
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

    return {
      examId: row.sourceNotification.examId,
      slug: row.slug,
      organization: row.organization,
      examName: row.examName,
      applyLastDate: showRecruitmentFields ? row.details?.applyLastDate ?? row.applyEnd : null,
      examDate: row.details?.examDate ?? null,
      vacancyTotal: showRecruitmentFields ? row.details?.vacancyTotal ?? row.vacancies : null,
      notificationPdfUrl: primaryNotificationUrl,
      applyUrlPrimary:
        row.links.find((link) => link.kind === "apply" && link.isPrimary)?.url ??
        row.applyOnlineUrl ??
        null,

      // Backward-compatible fields for unchanged UI components.
      id: row.id,
      title: row.examName,
      category: row.category,
      state: row.state,
      applyStart: showRecruitmentFields ? row.details?.applyBegin ?? row.applyStart : null,
      applyEnd: showRecruitmentFields ? row.details?.applyLastDate ?? row.applyEnd : null,
      vacancies: showRecruitmentFields ? row.details?.vacancyTotal ?? row.vacancies : null,
      officialNotificationUrl: primaryNotificationUrl,
      applyOnlineUrl:
        row.links.find((link) => link.kind === "apply" && link.isPrimary)?.url ??
        row.applyOnlineUrl ??
        null,
      status: row.status,
      updatedAt: row.updatedAt,
      hasUpdates: Boolean(row.sourceNotification.examId && latestNoticeByExamId.has(row.sourceNotification.examId)),
      latestUpdateNotice: row.sourceNotification.examId
        ? latestNoticeByExamId.get(row.sourceNotification.examId) ?? null
        : null,
    };
  });

  return NextResponse.json(payload);
}
