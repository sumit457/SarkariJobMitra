-- Create FieldCandidate table to store all candidate values for each field from different sources
CREATE TABLE "FieldCandidate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobDetailsId" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "candidateValue" JSONB NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.75,
    "extractedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FieldCandidate_jobDetailsId_fkey" FOREIGN KEY ("jobDetailsId") REFERENCES "JobDetails" ("id") ON DELETE CASCADE
);

-- Create FieldConflict table to store detected conflicts between field candidates
CREATE TABLE "FieldConflict" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobDetailsId" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "sourceA" TEXT NOT NULL,
    "valueA" JSONB NOT NULL,
    "sourceB" TEXT NOT NULL,
    "valueB" JSONB NOT NULL,
    "conflictType" TEXT NOT NULL DEFAULT 'mismatch',
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolution" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FieldConflict_jobDetailsId_fkey" FOREIGN KEY ("jobDetailsId") REFERENCES "JobDetails" ("id") ON DELETE CASCADE
);

-- Create indexes for efficient querying
CREATE INDEX "FieldCandidate_jobDetailsId_idx" ON "FieldCandidate"("jobDetailsId");
CREATE INDEX "FieldCandidate_fieldName_idx" ON "FieldCandidate"("fieldName");
CREATE INDEX "FieldCandidate_sourceType_idx" ON "FieldCandidate"("sourceType");

CREATE INDEX "FieldConflict_jobDetailsId_idx" ON "FieldConflict"("jobDetailsId");
CREATE INDEX "FieldConflict_fieldName_idx" ON "FieldConflict"("fieldName");
CREATE INDEX "FieldConflict_resolved_idx" ON "FieldConflict"("resolved");
