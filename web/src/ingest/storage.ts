import fs from "fs/promises";
import path from "path";

export async function savePdfLocal(params: { sha256: string; buf: Buffer }) {
  const dir = process.env.PDF_STORAGE_DIR ?? "./storage/pdfs";
  await fs.mkdir(dir, { recursive: true });

  const filename = `${params.sha256}.pdf`;
  const fullPath = path.join(dir, filename);

  await fs.writeFile(fullPath, params.buf);
  return { storagePath: fullPath };
}

export async function savePdf(params: { sha256: string; buf: Buffer }) {
  const mode = process.env.PDF_STORAGE_MODE ?? "local";

  if (mode === "local") {
    return savePdfLocal(params);
  }

  throw new Error(`Unsupported PDF_STORAGE_MODE=${mode}. Only \"local\" is currently implemented.`);
}
