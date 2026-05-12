import crypto from "crypto";
import { Prisma } from "@prisma/client";

import { prisma } from "@/src/lib/prisma";

import { parseUpscDetailPage } from "./detailPageExtractor";
import { resolveApplyDates } from "./dateSelection";
import { extractJobDetailsFromPdfText } from "./detailsExtractor";
import { validateAndSanitizeExtractedDetails, serializeExtractionForStorage } from "./extractionValidation";
import type { ExtractionSourceBasis } from "./extractionTypes";
import { extractTextSnippetFromHtml } from "./htmlText";
import { fetchTextWithOptionalFallback } from "./http";
import { extractJobDetailsFromPdfTextWithLlm, isLlmExtractorEnabled } from "./llmDetailsExtractor";
import { mergeExtractedDetails } from "./mergeExtractedDetails";
import { deriveExamName } from "./nameNormalizer";
import { classifyDocTypeFromText, deriveNoticeType, docTypeToCategory, isPublicJobDocType, shouldExposeRecruitmentFields } from "./noticeClassifier";
import { extractPdfTextFromNotification } from "./pdfText";
import { resolveJobLinks } from "./linkResolver";
import { extractFieldCandidates, detectFieldConflicts } from "./mergeEngine";

const JOB_NORMALIZE_SOURCE_KEYS = [
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

function enabledFlag(name: string, defaultValue = true) {
  const raw = process.env[name];
  if (raw === undefined) return defaultValue;
  return ["1", "true", "yes", "on"].includes(raw.toLowerCase());
}

function orgFromSourceKey(key: string) {
  if (key.startsWith("ssc_")) return "SSC";
  if (key.startsWith("sbi_")) return "SBI";
  if (key.startsWith("indiapost_")) return "India Post";
  if (key.startsWith("upsc_")) return "UPSC";
  return "Unknown";
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

function deriveJobStatus(sourceKey: string, applyBegin?: Date, applyLastDate?: Date) {
  if (sourceKey === "upsc_forthcoming_exams" || sourceKey === "upsc_exam_calendar") return "upcoming";
  const now = new Date();
  if (applyBegin && applyBegin.getTime() > now.getTime()) return "upcoming";
  if (!applyLastDate) return "active";
  return applyLastDate.getTime() < now.getTime() ? "expired" : "active";
}

function primaryApplyLink(links: Array<{ kind: string; url: string; isPrimary: boolean }>) {
  return links.find((link) => link.kind === "apply" && link.isPrimary)?.url ?? null;
}

function normalizeUpdateStatus(existingStatus: string | null | undefined, noticeType: string) {
  if (noticeType === "corrigendum" || noticeType === "extension_notice") return "updated";
  if (noticeType === "result" || noticeType === "admit_card" || noticeType === "answer_key") return existingStatus ?? "updated";
  return existingStatus ?? "updated";
}

function isUniqueViolation(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

function buildExtractionBasis(params: {
  titleRaw: string;
  detailPageText?: string;
  pdfText?: string;
  regexUsed: boolean;
  hasSourceUrls: boolean;
}) {
  const basis: ExtractionSourceBasis = {
    listingTitle: params.titleRaw.trim().length > 0,
    listingText: false,
    detailPageText: Boolean(params.detailPageText?.trim()),
    pdfText: Boolean(params.pdfText?.trim()),
    regexFields: params.regexUsed,
    sourceUrls: params.hasSourceUrls,
  };
  return basis;
}

function normalizeHintTitleForMatch(title: string) {
  return title
    .toLowerCase()
    .replace(/\b(result|merit|selected|selection list|provisional list|declaration|cut[-\s]?off|admit card|hall ticket|answer key|corrigendum|corrigenda|extension|extended|notice|notification|revised|tainted candidates)\b/g, " ")
    .replace(/\b\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenScore(a: string, b: string) {
  const left = new Set(a.split(" ").filter((token) => token.length > 2));
  const right = new Set(b.split(" ").filter((token) => token.length > 2));
  if (left.size === 0 || right.size === 0) return 0;
  let overlap = 0;
  for (const token of left) {
    if (right.has(token)) overlap += 1;
  }
  return overlap / Math.max(left.size, right.size);
}

async function findRelatedRecruitmentHint(params: {
  organization: string;
  titleRaw: string;
  excludeJobId?: string;
}) {
  const needle = normalizeHintTitleForMatch(params.titleRaw);
  if (needle.length < 8) return undefined;

  const candidates = await prisma.job.findMany({
    where: {
      organization: params.organization,
      ...(params.excludeJobId ? { id: { not: params.excludeJobId } } : {}),
      OR: [
        { category: "Recruitment" },
        { category: null },
      ],
    },
    select: {
      slug: true,
      examName: true,
      titleRaw: true,
      updatedAt: true,
    },
    orderBy: [{ updatedAt: "desc" }],
    take: 50,
  });

  let best: { slug: string; score: number } | undefined;
  let secondBest = 0;
  for (const candidate of candidates) {
    const haystack = normalizeHintTitleForMatch(`${candidate.examName} ${candidate.titleRaw}`);
    const score = tokenScore(needle, haystack);
    if (!best || score > best.score) {
      secondBest = best?.score ?? 0;
      best = { slug: candidate.slug, score };
    } else if (score > secondBest) {
      secondBest = score;
    }
  }

  if (!best) return undefined;
  if (best.score < 0.6) return undefined;
  if (best.score - secondBest < 0.12) return undefined;
  return best.slug;
}

export async function normalizeLatest(limit = 50, options?: { force?: boolean }) {
  const force = options?.force === true;
  const processingStaleBefore = new Date(Date.now() - 30 * 60 * 1000);
  const directSourceFilter = { source: { key: { in: [...DIRECT_NORMALIZE_SOURCE_KEYS] } } };

  const raws = await prisma.rawNotification.findMany({
    where: {
      source: { key: { in: [...JOB_NORMALIZE_SOURCE_KEYS] } },
      ...(force
        ? {}
        : {
            OR: [
              { status: "downloaded" },
              { status: "processing", updatedAt: { lt: processingStaleBefore } },
              { status: "new", ...directSourceFilter },
            ],
          }),
      AND: [
        {
          OR: [
            { pdfUrl: { not: null } },
            directSourceFilter,
          ],
        },
      ],
      ...(force ? {} : { processedAt: null }),
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
  let llmUsed = 0;
  let llmFallbackOnly = 0;
  let skippedNonPublic = 0;

  for (const raw of raws) {
    const claimed = await prisma.rawNotification.updateMany({
      where: force
        ? { id: raw.id }
        : {
            id: raw.id,
            OR: [
              { status: "downloaded" },
              { status: "processing", updatedAt: { lt: processingStaleBefore } },
              { status: "new" },
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
      let rawApplyUrl = raw.applyUrl ?? undefined;
      let rawPdfUrl = raw.pdfUrl ?? undefined;
      let rawPublishedOn = raw.publishedOn ?? undefined;
      let detailPageSummary: string | undefined;
      let detailPageApplyBegin: Date | undefined;
      let detailPageApplyLastDate: Date | undefined;
      let detailPageExamDate: Date | undefined;
      let detailPageText: string | undefined;

      if (raw.detailUrl && (raw.source.key.startsWith("upsc_") || isLlmExtractorEnabled())) {
        try {
          const detailPageRes = await fetchTextWithOptionalFallback(raw.detailUrl);
          if (detailPageRes.text) {
            detailPageText = extractTextSnippetFromHtml(detailPageRes.text);

            if (raw.source.key.startsWith("upsc_")) {
              const detailPage = parseUpscDetailPage(detailPageRes.text, raw.detailUrl);

              detailPageApplyBegin = detailPage.notificationDate ?? detailPage.examStartDate;
              detailPageApplyLastDate = detailPage.applicationLastDate;
              detailPageExamDate = detailPage.examStartDate;
              detailPageSummary = detailPage.summary;

              const rawPatch: {
                applyUrl?: string;
                pdfUrl?: string;
                publishedOn?: Date;
              } = {};

              if (!rawApplyUrl && detailPage.applyUrl) {
                rawApplyUrl = detailPage.applyUrl;
                rawPatch.applyUrl = detailPage.applyUrl;
              }

              if (!rawPdfUrl && detailPage.notificationPdfUrl) {
                rawPdfUrl = detailPage.notificationPdfUrl;
                rawPatch.pdfUrl = detailPage.notificationPdfUrl;
              }

              if (!rawPublishedOn && detailPage.notificationDate) {
                rawPublishedOn = detailPage.notificationDate;
                rawPatch.publishedOn = detailPage.notificationDate;
              }

              if (Object.keys(rawPatch).length > 0) {
                await prisma.rawNotification.update({
                  where: { id: raw.id },
                  data: rawPatch,
                });
              }
            }
          }
        } catch {
          // Keep normalization resilient; UPSC detail enrichment is best-effort.
        }
      }

      let pdfText = raw.pdfText ?? "";
      if (rawPdfUrl && (!raw.pdfTextExtracted || !pdfText)) {
        try {
          const extracted = await extractPdfTextFromNotification({
            storagePath: raw.storagePath,
            pdfUrl: rawPdfUrl,
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

      const regexDetails = extractJobDetailsFromPdfText(organization, pdfText);
      const deterministicDocType = classifyDocTypeFromText(raw.title, detailPageText, pdfText);
      const basis = buildExtractionBasis({
        titleRaw: raw.title,
        detailPageText,
        pdfText,
        regexUsed: Object.keys(serializeExtractionForStorage(regexDetails)).length > 0,
        hasSourceUrls: Boolean(raw.detailUrl || rawPdfUrl || rawApplyUrl || raw.officialPageUrl || raw.source.listingUrl),
      });
      const llmAttempt = await extractJobDetailsFromPdfTextWithLlm({
        organization,
        titleRaw: raw.title,
        detailPageText,
        pdfText,
        regexDetails: serializeExtractionForStorage(regexDetails),
        detailUrl: raw.detailUrl,
        notificationPdfUrl: rawPdfUrl,
        applyUrl: rawApplyUrl,
        officialPageUrl: raw.officialPageUrl ?? raw.detailUrl ?? raw.source.listingUrl,
        basis,
      });
      if (llmAttempt?.details) llmUsed += 1;
      else llmFallbackOnly += 1;

      const deterministicDetails = {
        ...regexDetails,
        docType: deterministicDocType,
        officialNotificationUrl: rawPdfUrl ?? undefined,
        officialApplyUrl: rawApplyUrl ?? undefined,
        sourceBasis: basis,
      };
      const merged = mergeExtractedDetails(llmAttempt?.details, deterministicDetails);
      const relatedJobHint =
        merged.relatedJobHint ??
        (deterministicDocType && !isPublicJobDocType(deterministicDocType)
          ? await findRelatedRecruitmentHint({
              organization,
              titleRaw: raw.title,
              excludeJobId: raw.job?.id,
            })
          : undefined);
      const validated = validateAndSanitizeExtractedDetails({
        details: {
          ...merged,
          relatedJobHint,
        },
        titleRaw: raw.title,
        detailPageText,
        pdfText,
      });
      const details = validated.details;
      const noticeType = deriveNoticeType(details.docType ?? deterministicDocType);
      const name = deriveExamName({
        organization,
        titleRaw: raw.title,
        pdfText,
        preferredTitle: details.canonicalTitle ?? details.positionName,
      });
      const category = docTypeToCategory(details.docType) ?? docTypeToCategory(deterministicDocType);
      const showRecruitmentFields = shouldExposeRecruitmentFields(raw.title, category, details.docType);
      const { applyBegin, applyLastDate } = resolveApplyDates({
        details,
        detailPageApplyBegin,
        detailPageApplyLastDate,
        sourceOpenDate: raw.sourceOpenDate,
        sourceCloseDate: raw.sourceCloseDate,
      });
      const examDate = details.examDate ?? detailPageExamDate;
      const shortSummary =
        details.shortSummary ??
        detailPageSummary ??
        (raw.sourceSession ? `Calendar entry from SSC examination calendar ${raw.sourceSession}.` : undefined);

      rawPdfUrl = rawPdfUrl ?? details.officialNotificationUrl ?? undefined;
      rawApplyUrl = rawApplyUrl ?? details.officialApplyUrl ?? undefined;

      const traceUpdate: Prisma.RawNotificationUpdateInput = {
        extractedDocType: details.docType ?? null,
        extractionConfidence: details.confidence ?? null,
        extractionModel: llmAttempt?.model ?? null,
        extractionPromptVersion: llmAttempt?.promptVersion ?? null,
        extractionBasis: basis as Prisma.InputJsonValue,
        ruleExtracted: serializeExtractionForStorage(deterministicDetails) as Prisma.InputJsonValue,
        llmRawResponse: llmAttempt?.rawResponse ?? null,
        llmNormalized: llmAttempt?.details ? (serializeExtractionForStorage(llmAttempt.details) as Prisma.InputJsonValue) : Prisma.JsonNull,
        mergedExtracted: serializeExtractionForStorage({
          ...details,
          shortSummary,
        }) as Prisma.InputJsonValue,
        validationWarnings: details.validationWarnings?.length ? (details.validationWarnings as Prisma.InputJsonValue) : Prisma.JsonNull,
        extractedAt: llmAttempt?.extractedAt ?? new Date(),
      };

      const links = resolveJobLinks({
        organization,
        titleRaw: raw.title,
        pdfText,
        notificationPdfUrl: rawPdfUrl,
        applyUrl: rawApplyUrl,
        detailUrl: raw.detailUrl,
        officialPageUrl: raw.officialPageUrl ?? raw.detailUrl ?? raw.source.listingUrl,
      });
      if (raw.source.key === "ssc_gov_calendar" && links.length === 0 && raw.detailUrl) {
        links.push({
          kind: "notification",
          label: "SSC Calendar Entry",
          url: raw.detailUrl,
          isPrimary: true,
        });
      }

      const slug = makeStableSlug(name.examName, raw.id);
      const applyOnlineUrl = primaryApplyLink(links);
      const status = isPublicJobDocType(details.docType) ? deriveJobStatus(raw.source.key, applyBegin, applyLastDate) : "expired";

      await prisma.rawNotification.update({
        where: { id: raw.id },
        data: traceUpdate,
      });

      if (!isPublicJobDocType(details.docType)) {
        let targetJob = raw.job;
        if (!targetJob && details.relatedJobHint) {
          targetJob = await prisma.job.findUnique({
            where: { slug: details.relatedJobHint },
          });
        }

        if (targetJob) {
          await prisma.job.update({
            where: { id: targetJob.id },
            data: {
              category,
              status: normalizeUpdateStatus(targetJob.status, noticeType),
              shortSummary,
              notificationPdfUrl: rawPdfUrl ?? targetJob.notificationPdfUrl ?? undefined,
              officialNotificationUrl: rawPdfUrl ?? targetJob.officialNotificationUrl ?? undefined,
              applyOnlineUrl: rawApplyUrl ?? targetJob.applyOnlineUrl ?? undefined,
            },
          });

          await prisma.jobDetails.upsert({
            where: { jobId: targetJob.id },
            update: {
              docType: details.docType ?? null,
              isNewJob: false,
              canonicalTitle: details.canonicalTitle ?? null,
              shortTitle: details.shortTitle ?? null,
              relatedJobHint: details.relatedJobHint ?? null,
              extractionConfidence: details.confidence ?? null,
              shortSummary,
              applyBegin: null,
              applyLastDate: null,
              examDate: details.examDate ?? null,
              feeLastDate: null,
              correctionFrom: null,
              correctionTo: null,
              feeGeneral: null,
              feeObc: null,
              feeScSt: null,
              feePh: null,
              feeFemale: null,
              feeNote: null,
              ageMin: null,
              ageMax: null,
              ageAsOn: null,
              vacancyTotal: null,
              positionName: null,
              department: null,
              placeOfPosting: null,
              qualification: null,
              payScale: null,
              examCentres: null,
              categoryVacancy: Prisma.JsonNull,
            },
            create: {
              jobId: targetJob.id,
              docType: details.docType ?? null,
              isNewJob: false,
              canonicalTitle: details.canonicalTitle ?? null,
              shortTitle: details.shortTitle ?? null,
              relatedJobHint: details.relatedJobHint ?? null,
              extractionConfidence: details.confidence ?? null,
              shortSummary,
              examDate: details.examDate ?? null,
              categoryVacancy: Prisma.JsonNull,
            },
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
        skippedNonPublic += 1;
        continue;
      }

      const job = await prisma.job.upsert({
        where: { sourceNotificationId: raw.id },
        update: {
          organization,
          examName: name.examName,
          titleRaw: raw.title,
          title: name.examName,
          slug,
          category,
          publishedOn: rawPublishedOn ?? raw.fetchedAt,
          notificationPdfUrl: rawPdfUrl ?? undefined,
          officialNotificationUrl: rawPdfUrl ?? undefined,
          applyOnlineUrl: applyOnlineUrl ?? undefined,
          applyStart: showRecruitmentFields ? applyBegin : null,
          applyEnd: showRecruitmentFields ? applyLastDate : null,
          vacancies: showRecruitmentFields ? details.vacancyTotal : null,
          shortSummary,
          status,
        },
        create: {
          sourceNotificationId: raw.id,
          organization,
          examName: name.examName,
          titleRaw: raw.title,
          title: name.examName,
          slug,
          category,
          publishedOn: rawPublishedOn ?? raw.fetchedAt,
          notificationPdfUrl: rawPdfUrl ?? undefined,
          officialNotificationUrl: rawPdfUrl ?? undefined,
          applyOnlineUrl: applyOnlineUrl ?? undefined,
          applyStart: showRecruitmentFields ? applyBegin : null,
          applyEnd: showRecruitmentFields ? applyLastDate : null,
          vacancies: showRecruitmentFields ? details.vacancyTotal : null,
          shortSummary,
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
        applyBegin: showRecruitmentFields ? applyBegin : null,
        applyLastDate: showRecruitmentFields ? applyLastDate : null,
        examDate: examDate ?? null,
        docType: details.docType ?? null,
        isNewJob: typeof details.isNewJob === "boolean" ? details.isNewJob : null,
        canonicalTitle: details.canonicalTitle ?? null,
        shortTitle: details.shortTitle ?? null,
        feeLastDate: showRecruitmentFields ? details.feeLastDate ?? null : null,
        correctionFrom: showRecruitmentFields ? details.correctionFrom ?? null : null,
        correctionTo: showRecruitmentFields ? details.correctionTo ?? null : null,
        feeGeneral: showRecruitmentFields ? details.feeGeneral ?? null : null,
        feeObc: showRecruitmentFields ? details.feeObc ?? null : null,
        feeScSt: showRecruitmentFields ? details.feeScSt ?? null : null,
        feePh: showRecruitmentFields ? details.feePh ?? null : null,
        feeFemale: showRecruitmentFields ? details.feeFemale ?? null : null,
        feeNote: showRecruitmentFields ? details.feeNote ?? null : null,
        ageMin: showRecruitmentFields ? details.ageMin ?? null : null,
        ageMax: showRecruitmentFields ? details.ageMax ?? null : null,
        ageAsOn: showRecruitmentFields ? details.ageAsOn ?? null : null,
        vacancyTotal: showRecruitmentFields ? details.vacancyTotal ?? null : null,
        positionName: showRecruitmentFields ? details.positionName ?? null : null,
        department: showRecruitmentFields ? details.department ?? null : null,
        placeOfPosting: showRecruitmentFields ? details.placeOfPosting ?? null : null,
        qualification: showRecruitmentFields ? details.qualification ?? null : null,
        payScale: showRecruitmentFields ? details.payScale ?? null : null,
        examCentres: showRecruitmentFields ? details.examCentres ?? null : null,
        categoryVacancy: showRecruitmentFields ? details.categoryVacancy ?? undefined : Prisma.JsonNull,
        relatedJobHint: details.relatedJobHint ?? null,
        extractionConfidence: details.confidence ?? null,
        shortSummary,
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

      // Extract field candidates from all sources and detect conflicts
      const jobDetailsRecord = await prisma.jobDetails.findUnique({
        where: { jobId: job.id },
      });

      if (jobDetailsRecord && enabledFlag("ENABLE_FIELD_CANDIDATES")) {
        try {
          const fieldCandidates = extractFieldCandidates({
            regexDetails,
            llmDetails: llmAttempt?.details,
            detailPageDetails: {
              applyBegin: detailPageApplyBegin,
              applyLastDate: detailPageApplyLastDate,
              examDate: detailPageExamDate,
              shortSummary: detailPageSummary,
            },
            basis,
            detailUrl: raw.detailUrl ?? undefined,
            notificationPdfUrl: rawPdfUrl,
            applyUrl: rawApplyUrl,
          });

          if (fieldCandidates.length > 0) {
            // Store all field candidates
            await prisma.fieldCandidate.createMany({
              data: fieldCandidates.map((fc) => ({
                jobDetailsId: jobDetailsRecord.id,
                fieldName: fc.fieldName,
                candidateValue: fc.candidateValue as Prisma.InputJsonValue,
                sourceType: fc.sourceType,
                sourceUrl: fc.sourceUrl,
                confidence: fc.confidence,
                extractedAt: fc.extractedAt,
              })),
              skipDuplicates: true,
            });

            // Detect and store conflicts
            const conflicts = detectFieldConflicts(fieldCandidates);
            if (conflicts.length > 0) {
              await prisma.fieldConflict.createMany({
                data: conflicts.map((cf) => ({
                  jobDetailsId: jobDetailsRecord.id,
                  fieldName: cf.fieldName,
                  sourceA: cf.sourceA,
                  valueA: cf.valueA as Prisma.InputJsonValue,
                  sourceB: cf.sourceB,
                  valueB: cf.valueB as Prisma.InputJsonValue,
                  conflictType: cf.conflictType,
                })),
                skipDuplicates: true,
              });
            }
          }
        } catch (candidateError) {
          // Log but don't fail the entire normalization for candidate extraction
          console.warn("[normalize] field candidate extraction error:", (candidateError as Error)?.message);
        }
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
    llmEnabled: isLlmExtractorEnabled(),
    llmUsed,
    llmFallbackOnly,
    skippedNonPublic,
  };
}
