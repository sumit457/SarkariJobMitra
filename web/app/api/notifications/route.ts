import { NextResponse } from "next/server";

import { prisma } from "@/src/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const take = Math.min(Math.max(Number(searchParams.get("limit") ?? "50"), 1), 200);

  const rows = await prisma.rawNotification.findMany({
    orderBy: { fetchedAt: "desc" },
    take,
    include: { source: true },
  });

  const payload = rows.map((row) => ({
    id: row.id,
    sourceKey: row.source.key,
    sourceName: row.source.name,
    title: row.title,
    publishedOn: row.publishedOn,
    detailUrl: row.detailUrl,
    pdfUrl: row.pdfUrl,
    applyUrl: row.applyUrl,
    officialPageUrl: row.officialPageUrl,
    pdfSha256: row.pdfSha256,
    pdfBytes: row.pdfBytes,
    storagePath: row.storagePath,
    pdfTextExtracted: row.pdfTextExtracted,
    fetchedAt: row.fetchedAt,
    status: row.status,
    error: row.error,
  }));

  return NextResponse.json(payload);
}
