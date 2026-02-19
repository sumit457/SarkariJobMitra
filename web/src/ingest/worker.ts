import { startWorker } from "./queue";

async function main() {
  await startWorker();
  console.log("[ingest] worker started");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
