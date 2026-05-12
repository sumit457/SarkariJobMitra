import { Queue, Worker } from "bullmq";
import type { ConnectionOptions } from "bullmq";

import { prisma } from "@/src/lib/prisma";

import { ingestSource, downloadPdfForRawNotification } from "./ingestOneSource";
import { normalizeLatest } from "./normalize";
import { DEFAULT_SOURCES } from "./sources";

const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
const redis = new URL(redisUrl);

const connection: ConnectionOptions = {
  host: redis.hostname,
  port: Number(redis.port || 6379),
  username: redis.username || undefined,
  password: redis.password || undefined,
  db: redis.pathname ? Number(redis.pathname.slice(1) || 0) : 0,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  tls: redis.protocol === "rediss:" ? {} : undefined,
};

export const ingestQueue = new Queue("ingest", {
  connection,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 200,
  },
});

async function queueNormalizeSoon(delay = 20_000) {
  await ingestQueue.add(
    "normalize-latest",
    {},
    {
      delay,
      jobId: "normalize-latest-pending",
    },
  );
}

async function queueDownloadBatch(limit = 100) {
  const raws = await prisma.rawNotification.findMany({
    where: {
      status: { in: ["new", "error"] },
      pdfUrl: { not: null },
    },
    take: limit,
    orderBy: { fetchedAt: "desc" },
  });

  for (const raw of raws) {
    await ingestQueue.add("download-pdf", { rawId: raw.id });
  }

  return { queued: raws.length };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function ingestSourceWithRetry(sourceKey: string) {
  const maxAttempts = Math.max(Number(process.env.INGEST_RETRY_ATTEMPTS ?? 2), 1);
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const result = await ingestSource(sourceKey);
      return { ok: true, attempt, result };
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        const delayMs = Math.min(1500 * attempt, 4000);
        await sleep(delayMs);
      }
    }
  }

  return {
    ok: false,
    attempt: maxAttempts,
    error: String((lastError as Error)?.message ?? lastError ?? "unknown_error"),
  };
}

export async function startWorker() {
  const concurrency = Number(process.env.INGEST_CONCURRENCY ?? 3);

  const worker = new Worker(
    "ingest",
    async (job) => {
      if (job.name === "ingest-source") {
        const { sourceKey } = job.data as { sourceKey: string };
        return ingestSourceWithRetry(sourceKey);
      }

      if (job.name === "ingest-cycle") {
        const results: Array<{ sourceKey: string; result: unknown }> = [];
        for (const source of DEFAULT_SOURCES) {
          const result = await ingestSourceWithRetry(source.key);
          results.push({ sourceKey: source.key, result });
        }

        const queued = await queueDownloadBatch(150);
        await queueNormalizeSoon(120_000);

        return {
          ok: true,
          results,
          ...queued,
        };
      }

      if (job.name === "download-pdf") {
        const { rawId } = job.data as { rawId: string };
        const result = await downloadPdfForRawNotification(rawId);
        if (result.ok) {
          await queueNormalizeSoon(15_000);
        }
        return result;
      }

      if (job.name === "drain-downloads") {
        return queueDownloadBatch(150);
      }

      if (job.name === "normalize-latest") {
        return normalizeLatest(100);
      }

      return { ok: true, noop: true };
    },
    {
      connection,
      concurrency,
    },
  );

  worker.on("failed", (job, error) => {
    const id = job?.id ? String(job.id) : "unknown";
    console.error(`[ingest-worker] job failed id=${id} name=${job?.name}:`, error.message);
  });

  worker.on("completed", (job) => {
    const id = job?.id ? String(job.id) : "unknown";
    console.log(`[ingest-worker] job completed id=${id} name=${job?.name}`);
  });

  return worker;
}
