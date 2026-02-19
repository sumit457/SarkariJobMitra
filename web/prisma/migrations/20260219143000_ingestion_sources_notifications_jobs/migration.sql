-- CreateTable
CREATE TABLE "Source" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "listingUrl" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastCheckedAt" TIMESTAMP(3),
    "etag" TEXT,
    "lastHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RawNotification" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "publishedOn" TIMESTAMP(3),
    "detailUrl" TEXT,
    "pdfUrl" TEXT,
    "applyUrl" TEXT,
    "canonicalKey" TEXT NOT NULL,
    "pdfSha256" TEXT,
    "pdfBytes" INTEGER,
    "storagePath" TEXT,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'new',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RawNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "sourceNotificationId" TEXT NOT NULL,
    "organization" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" TEXT,
    "state" TEXT,
    "applyStart" TIMESTAMP(3),
    "applyEnd" TIMESTAMP(3),
    "vacancies" INTEGER,
    "officialNotificationUrl" TEXT,
    "applyOnlineUrl" TEXT,
    "shortSummary" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Source_key_key" ON "Source"("key");

-- CreateIndex
CREATE UNIQUE INDEX "RawNotification_canonicalKey_key" ON "RawNotification"("canonicalKey");

-- CreateIndex
CREATE INDEX "RawNotification_sourceId_idx" ON "RawNotification"("sourceId");

-- CreateIndex
CREATE INDEX "RawNotification_status_idx" ON "RawNotification"("status");

-- CreateIndex
CREATE INDEX "RawNotification_fetchedAt_idx" ON "RawNotification"("fetchedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Job_sourceNotificationId_key" ON "Job"("sourceNotificationId");

-- CreateIndex
CREATE UNIQUE INDEX "Job_slug_key" ON "Job"("slug");

-- CreateIndex
CREATE INDEX "Job_organization_idx" ON "Job"("organization");

-- CreateIndex
CREATE INDEX "Job_status_idx" ON "Job"("status");

-- CreateIndex
CREATE INDEX "Job_createdAt_idx" ON "Job"("createdAt");

-- AddForeignKey
ALTER TABLE "RawNotification" ADD CONSTRAINT "RawNotification_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_sourceNotificationId_fkey" FOREIGN KEY ("sourceNotificationId") REFERENCES "RawNotification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

