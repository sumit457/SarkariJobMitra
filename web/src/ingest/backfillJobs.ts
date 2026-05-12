import { prisma } from "@/src/lib/prisma";

import { parseUpscDetailPage } from "./detailPageExtractor";
import { fetchTextWithOptionalFallback } from "./http";
import { normalizeLatest } from "./normalize";

const JOB_SOURCE_KEYS = [
  "ssc_gov_calendar",
  "sbi_current_openings",
  "indiapost_vacancies",
  "indiapost_gds",
  "upsc_active_exams",
  "upsc_forthcoming_exams",
  "upsc_exam_calendar",
] as const;

const DIRECT_NORMALIZE_SOURCE_KEYS = [
  "ssc_gov_calendar",
  "sbi_current_openings",
  "upsc_active_exams",
  "upsc_forthcoming_exams",
  "upsc_exam_calendar",
] as const;

async function repairUpscExamDates() {
  const rows = await prisma.job.findMany({
    where: {
      organization: "UPSC",
      sourceNotification: {
        detailUrl: { not: null },
      },
    },
    include: {
      details: true,
      sourceNotification: true,
    },
  });

  let updated = 0;

  for (const row of rows) {
    if (row.details?.examDate) continue;

    const detailUrl = row.sourceNotification.detailUrl;
    if (!detailUrl) continue;

    try {
      const res = await fetchTextWithOptionalFallback(detailUrl);
      if (!res.text) continue;

      const parsed = parseUpscDetailPage(res.text, detailUrl);
      if (!parsed.examStartDate) continue;

      await prisma.jobDetails.upsert({
        where: { jobId: row.id },
        update: {
          examDate: parsed.examStartDate,
          shortSummary: row.details?.shortSummary ?? parsed.summary ?? null,
        },
        create: {
          jobId: row.id,
          examDate: parsed.examStartDate,
          shortSummary: parsed.summary ?? null,
        },
      });
      updated += 1;
    } catch {
      // Best-effort repair pass for detail pages.
    }
  }

  return updated;
}

async function main() {
  const batchSize = Math.min(Math.max(Number(process.argv[2] ?? "200"), 1), 500);

  await prisma.rawNotification.updateMany({
    where: {
      source: { key: { in: [...JOB_SOURCE_KEYS] } },
      pdfUrl: { not: null },
    },
    data: {
      processedAt: null,
      status: "downloaded",
      error: null,
    },
  });

  await prisma.rawNotification.updateMany({
    where: {
      source: { key: { in: [...DIRECT_NORMALIZE_SOURCE_KEYS] } },
      pdfUrl: null,
    },
    data: {
      processedAt: null,
      status: "new",
      error: null,
    },
  });

  let cycles = 0;
  let totalScanned = 0;
  let totalUpserted = 0;
  let totalMarkedProcessed = 0;

  while (true) {
    cycles += 1;
    const result = await normalizeLatest(batchSize);
    totalScanned += result.scanned;
    totalUpserted += result.upserted;
    totalMarkedProcessed += result.markedProcessed;
    console.log(`[backfill] cycle=${cycles}`, result);
    if (result.scanned === 0) break;
  }

  const repairedUpscExamDates = await repairUpscExamDates();

  console.log("[backfill] completed", {
    cycles,
    totalScanned,
    totalUpserted,
    totalMarkedProcessed,
    repairedUpscExamDates,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
