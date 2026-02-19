import { ingestQueue } from "./queue";
import { DEFAULT_SOURCES } from "./sources";

export async function runSchedulerOnce() {
  for (const source of DEFAULT_SOURCES) {
    await ingestQueue.add("ingest-source", { sourceKey: source.key });
  }

  // Delay follow-up stages slightly so source crawls are likely finished first.
  await ingestQueue.add("drain-downloads", {}, { delay: 90_000 });
  await ingestQueue.add("normalize-latest", {}, { delay: 180_000, jobId: "normalize-latest-pending" });
}

export async function runCycleJob() {
  await ingestQueue.add("ingest-cycle", {});
}
