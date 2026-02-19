import fs from "fs/promises";

import { PDFParse } from "pdf-parse";

import { downloadBinary } from "./http";

const MAX_PDF_TEXT_LENGTH = 300_000;

function normalizePdfText(text: string) {
  return text.replace(/\u0000/g, "").replace(/\r/g, "\n").replace(/\t/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

export async function extractPdfTextFromBuffer(buf: Buffer) {
  const parser = new PDFParse({ data: new Uint8Array(buf) });

  try {
    const parsed = await parser.getText();
    const normalized = normalizePdfText(parsed.text ?? "");
    const truncated = normalized.slice(0, MAX_PDF_TEXT_LENGTH);
    return {
      text: truncated,
      pages: parsed.total ?? undefined,
      info: undefined,
    };
  } finally {
    await parser.destroy().catch(() => undefined);
  }
}

export async function extractPdfTextFromPath(path: string) {
  const buf = await fs.readFile(path);
  return extractPdfTextFromBuffer(buf);
}

export async function extractPdfTextFromNotification(params: {
  storagePath?: string | null;
  pdfUrl?: string | null;
}) {
  if (params.storagePath) {
    try {
      return await extractPdfTextFromPath(params.storagePath);
    } catch {
      // Fall back to URL download below.
    }
  }

  if (!params.pdfUrl) {
    return { text: "" };
  }

  const downloaded = await downloadBinary(params.pdfUrl);
  return extractPdfTextFromBuffer(downloaded.buf);
}
