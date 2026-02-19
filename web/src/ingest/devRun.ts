import { startWorker } from "./queue";
import { runCycleJob } from "./scheduler";

async function main() {
  await startWorker();
  await runCycleJob();

  const intervalMs = Number(process.env.SCHEDULER_INTERVAL_MS ?? 10 * 60 * 1000);
  setInterval(() => {
    runCycleJob().catch((error) => {
      console.error("[ingest] failed to enqueue cycle:", error);
    });
  }, intervalMs);

  console.log(`[ingest] worker started; scheduler interval=${intervalMs}ms`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
