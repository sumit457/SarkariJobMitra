-- Add metadata fields needed to link calendar-driven jobs with notice-board updates.
ALTER TABLE "RawNotification"
  ADD COLUMN IF NOT EXISTS "examId" TEXT,
  ADD COLUMN IF NOT EXISTS "sourceOpenDate" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "sourceCloseDate" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "sourceSession" TEXT;

CREATE INDEX IF NOT EXISTS "RawNotification_examId_idx" ON "RawNotification"("examId");
CREATE INDEX IF NOT EXISTS "RawNotification_sourceSession_idx" ON "RawNotification"("sourceSession");
