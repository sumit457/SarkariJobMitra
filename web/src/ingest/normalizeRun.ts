import { normalizeLatest } from "./normalize";

async function main() {
  const result = await normalizeLatest(200);
  console.log("[ingest] normalize result:", result);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
