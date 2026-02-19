import crypto from "crypto";
import { Prisma } from "@prisma/client";

import { prisma } from "@/src/lib/prisma";

import { extractJobDetailsFromPdfText } from "./detailsExtractor";
import { deriveExamName } from "./nameNormalizer";
import { extractPdfTextFromNotification } from "./pdfText";
import { resolveJobLinks } from "./linkResolver";

function orgFromSourceKey(key: string) {
  if (key.startsWith("ssc_")) return "SSC";
  if (key.startsWith("indiapost_")) return "India Post";
  return "Unknown";
}

function categoryFromTitle(title: string): string | undefined {
  const lower = title.toLowerCase();
  if (lower.includes("result")) return "Result";
  if (lower.includes("admit card")) return "Admit Card";
  if (lower.includes("answer key")) return "Answer Key";
  if (lower.includes("recruit") || lower.includes("vacanc") || lower.includes("engagement") || lower.includes("notice")) {
    return "Recruitment";
  }
  return undefined;
}

function makeStableSlug(examName: string, rawId: string) {
  const base = examName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);

  const hash = crypto.createHash("sha1").update(rawId).digest("hex").slice(0, 8);
  return `${base || "job"}-${hash}`;
}

function deriveJobStatus(applyLastDate?: Date) {
  if (!applyLastDate) return "active";
  const now = new Date();
  return applyLastDate.getTime() < now.getTime() ? "expired" : "active";
}

function primaryApplyLink(links: Array<{ kind: string; url: string; isPrimary: boolean }>) {
  return links.find((link) => link.kind === "apply" && link.isPrimary)?.url ?? null;
}

function isUniqueViolation(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export async function normalizeLatest(limit = 50) {
  const processingStaleBefore = new Date(Date.now() - 30 * 60 * 1000);

  const raws = await prisma.rawNotification.findMany({
    where: {
      OR: [
        { status: "downloaded" },
        { status: "processing", updatedAt: { lt: processingStaleBefore } },
      ],
      processedAt: null,
      pdfUrl: { not: null },
    },
    include: {
      source: true,
      job: true,
    },
    orderBy: { fetchedAt: "desc" },
    take: limit,
  });

  let upserted = 0;
  let markedProcessed = 0;

  for (const raw of raws) {
    const claimed = await prisma.rawNotification.updateMany({
      where: {
        id: raw.id,
        OR: [
          { status: "downloaded" },
          { status: "processing", updatedAt: { lt: processingStaleBefore } },
        ],
        processedAt: null,
      },
      data: {
        status: "processing",
      },
    });

    if (claimed.count === 0) {
      continue;
    }

    try {
      const organization = orgFromSourceKey(raw.source.key);

      let pdfText = raw.pdfText ?? "";
      if (!raw.pdfTextExtracted || !pdfText) {
        try {
          const extracted = await extractPdfTextFromNotification({
            storagePath: raw.storagePath,
            pdfUrl: raw.pdfUrl,
          });
          pdfText = extracted.text;

          await prisma.rawNotification.update({
            where: { id: raw.id },
            data: {
              pdfText,
              pdfTextExtracted: pdfText.length > 0,
              officialPageUrl: raw.detailUrl ?? raw.source.listingUrl,
            },
          });
        } catch {
          pdfText = raw.pdfText ?? "";
        }
      }

      const name = deriveExamName({
        organization,
        titleRaw: raw.title,
        pdfText,
      });

      const details = extractJobDetailsFromPdfText(organization, pdfText);

      const links = resolveJobLinks({
        organization,
        titleRaw: raw.title,
        pdfText,
        notificationPdfUrl: raw.pdfUrl,
        applyUrl: raw.applyUrl,
        detailUrl: raw.detailUrl,
      });

      const slug = makeStableSlug(name.examName, raw.id);
      const applyOnlineUrl = primaryApplyLink(links);
      const status = deriveJobStatus(details.applyLastDate);

      const job = await prisma.job.upsert({
        where: { sourceNotificationId: raw.id },
        update: {
          organization,
          examName: name.examName,
          titleRaw: raw.title,
          title: name.examName,
          slug,
          category: categoryFromTitle(raw.title),
          publishedOn: raw.publishedOn ?? raw.fetchedAt,
          notificationPdfUrl: raw.pdfUrl ?? undefined,
          officialNotificationUrl: raw.pdfUrl ?? undefined,
          applyOnlineUrl: applyOnlineUrl ?? undefined,
          applyStart: details.applyBegin,
          applyEnd: details.applyLastDate,
          vacancies: details.vacancyTotal,
          shortSummary: details.shortSummary,
          status,
        },
        create: {
          sourceNotificationId: raw.id,
          organization,
          examName: name.examName,
          titleRaw: raw.title,
          title: name.examName,
          slug,
          category: categoryFromTitle(raw.title),
          publishedOn: raw.publishedOn ?? raw.fetchedAt,
          notificationPdfUrl: raw.pdfUrl ?? undefined,
          officialNotificationUrl: raw.pdfUrl ?? undefined,
          applyOnlineUrl: applyOnlineUrl ?? undefined,
          applyStart: details.applyBegin,
          applyEnd: details.applyLastDate,
          vacancies: details.vacancyTotal,
          shortSummary: details.shortSummary,
          status,
        },
      });

      upserted += 1;

      await prisma.jobLink.deleteMany({
        where: { jobId: job.id },
      });

      if (links.length > 0) {
        await prisma.jobLink.createMany({
          data: links.map((link) => ({
            jobId: job.id,
            kind: link.kind,
            label: link.label,
            url: link.url,
            isPrimary: link.isPrimary,
          })),
        });
      }

      const detailsPayload = {
        applyBegin: details.applyBegin,
        applyLastDate: details.applyLastDate,
        feeLastDate: details.feeLastDate,
        correctionFrom: details.correctionFrom,
        correctionTo: details.correctionTo,
        feeGeneral: details.feeGeneral,
        feeObc: details.feeObc,
        feeScSt: details.feeScSt,
        feePh: details.feePh,
        feeFemale: details.feeFemale,
        feeNote: details.feeNote,
        ageMin: details.ageMin,
        ageMax: details.ageMax,
        ageAsOn: details.ageAsOn,
        vacancyTotal: details.vacancyTotal,
        shortSummary: details.shortSummary,
      };

      try {
        await prisma.jobDetails.upsert({
          where: { jobId: job.id },
          update: detailsPayload,
          create: {
            jobId: job.id,
            ...detailsPayload,
          },
        });
      } catch (error) {
        if (!isUniqueViolation(error)) {
          throw error;
        }

        await prisma.jobDetails.update({
          where: { jobId: job.id },
          data: detailsPayload,
        });
      }

      await prisma.rawNotification.update({
        where: { id: raw.id },
        data: {
          processedAt: new Date(),
          status: "processed",
          error: null,
          officialPageUrl: raw.detailUrl ?? raw.source.listingUrl,
        },
      });
      markedProcessed += 1;
    } catch (error) {
      await prisma.rawNotification.update({
        where: { id: raw.id },
        data: {
          status: "error",
          error: String((error as Error)?.message ?? error),
        },
      });
    }
  }

  return {
    ok: true,
    scanned: raws.length,
    upserted,
    markedProcessed,
  };
}
