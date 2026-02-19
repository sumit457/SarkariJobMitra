-- Additive migration only: do not touch unrelated legacy tables.

-- Raw notification text extraction fields.
ALTER TABLE "RawNotification"
  ADD COLUMN IF NOT EXISTS "officialPageUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "pdfText" TEXT,
  ADD COLUMN IF NOT EXISTS "pdfTextExtracted" BOOLEAN NOT NULL DEFAULT false;

-- New normalized job fields.
ALTER TABLE "Job"
  ADD COLUMN IF NOT EXISTS "examName" TEXT,
  ADD COLUMN IF NOT EXISTS "titleRaw" TEXT,
  ADD COLUMN IF NOT EXISTS "notificationPdfUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "publishedOn" TIMESTAMP(3);

-- Backfill existing rows.
UPDATE "Job"
SET
  "examName" = COALESCE(NULLIF("examName", ''), "title"),
  "titleRaw" = COALESCE(NULLIF("titleRaw", ''), "title"),
  "notificationPdfUrl" = COALESCE("notificationPdfUrl", "officialNotificationUrl"),
  "publishedOn" = COALESCE("publishedOn", "createdAt");

ALTER TABLE "Job"
  ALTER COLUMN "examName" SET NOT NULL,
  ALTER COLUMN "titleRaw" SET NOT NULL;

-- New links table.
CREATE TABLE IF NOT EXISTS "JobLink" (
  "id" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "JobLink_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "JobLink_jobId_idx" ON "JobLink"("jobId");
CREATE INDEX IF NOT EXISTS "JobLink_kind_idx" ON "JobLink"("kind");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'JobLink_jobId_fkey'
  ) THEN
    ALTER TABLE "JobLink"
      ADD CONSTRAINT "JobLink_jobId_fkey"
      FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- New structured details table.
CREATE TABLE IF NOT EXISTS "JobDetails" (
  "id" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "applyBegin" TIMESTAMP(3),
  "applyLastDate" TIMESTAMP(3),
  "feeLastDate" TIMESTAMP(3),
  "correctionFrom" TIMESTAMP(3),
  "correctionTo" TIMESTAMP(3),
  "feeGeneral" INTEGER,
  "feeObc" INTEGER,
  "feeScSt" INTEGER,
  "feePh" INTEGER,
  "feeFemale" INTEGER,
  "feeNote" TEXT,
  "ageMin" INTEGER,
  "ageMax" INTEGER,
  "ageAsOn" TIMESTAMP(3),
  "vacancyTotal" INTEGER,
  "shortSummary" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "JobDetails_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "JobDetails_jobId_key" ON "JobDetails"("jobId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'JobDetails_jobId_fkey'
  ) THEN
    ALTER TABLE "JobDetails"
      ADD CONSTRAINT "JobDetails_jobId_fkey"
      FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
