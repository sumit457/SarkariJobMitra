import { normalizeLatest } from "./normalize";

async function main() {
  const force = process.argv.includes("--force");
  const result = await normalizeLatest(200, { force });
  console.log("[ingest] normalize result:", result);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
