import { ingestQueue } from "./queue";
import { runSchedulerOnce } from "./scheduler";

async function main() {
  await runSchedulerOnce();
  await ingestQueue.close();
  console.log("[ingest] scheduler run queued");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
