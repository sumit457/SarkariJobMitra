import { NextResponse } from "next/server";

import { prisma } from "@/src/lib/prisma";

export const runtime = "nodejs";

type Context = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: Request, context: Context) {
  const { slug } = await context.params;

  let row = await prisma.job.findUnique({
    where: { slug },
    include: {
      details: true,
      links: {
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
      },
      sourceNotification: {
        include: { source: true },
      },
    },
  });

  if (!row) {
    row = await prisma.job.findUnique({
      where: { id: slug },
      include: {
        details: true,
        links: {
          orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        },
        sourceNotification: {
          include: { source: true },
        },
      },
    });
  }

  if (!row) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({
    slug: row.slug,
    organization: row.organization,
    examName: row.examName,
    titleRaw: row.titleRaw,
    notificationPdfUrl: row.notificationPdfUrl ?? row.officialNotificationUrl,
    links: row.links.map((link) => ({
      kind: link.kind,
      label: link.label,
      url: link.url,
      isPrimary: link.isPrimary,
    })),
    details: row.details
      ? {
          applyBegin: row.details.applyBegin,
          applyLastDate: row.details.applyLastDate,
          feeLastDate: row.details.feeLastDate,
          correctionFrom: row.details.correctionFrom,
          correctionTo: row.details.correctionTo,
          feeGeneral: row.details.feeGeneral,
          feeObc: row.details.feeObc,
          feeScSt: row.details.feeScSt,
          feePh: row.details.feePh,
          feeFemale: row.details.feeFemale,
          feeNote: row.details.feeNote,
          ageMin: row.details.ageMin,
          ageMax: row.details.ageMax,
          ageAsOn: row.details.ageAsOn,
          vacancyTotal: row.details.vacancyTotal,
          shortSummary: row.details.shortSummary,
        }
      : null,
    source: {
      sourceKey: row.sourceNotification.source.key,
      sourceName: row.sourceNotification.source.name,
      publishedOn: row.publishedOn,
      fetchedAt: row.sourceNotification.fetchedAt,
      pdfSha256: row.sourceNotification.pdfSha256,
    },
  });
}
