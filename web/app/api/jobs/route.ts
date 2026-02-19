import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/src/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const take = Math.min(Math.max(Number(searchParams.get("limit") ?? "50"), 1), 200);
  const skip = Math.max(Number(searchParams.get("offset") ?? "0"), 0);
  const search = (searchParams.get("search") ?? "").trim().toLowerCase();
  const organization = (searchParams.get("organization") ?? "").trim();
  const state = (searchParams.get("state") ?? "").trim();
  const status = (searchParams.get("status") ?? "").trim();
  const activeOnlyRaw = (searchParams.get("activeOnly") ?? searchParams.get("active_only") ?? "").trim().toLowerCase();
  const activeOnly = ["1", "true", "yes"].includes(activeOnlyRaw);

  const where: Prisma.JobWhereInput = {
    ...(organization ? { organization } : {}),
    ...(state ? { state } : {}),
    ...(status
      ? { status }
      : activeOnly
        ? {
            status: {
              in: ["active", "upcoming", "unknown"],
            },
          }
        : {}),
    ...(search
      ? {
          OR: [
            { examName: { contains: search, mode: "insensitive" } },
            { titleRaw: { contains: search, mode: "insensitive" } },
            { organization: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const rows = await prisma.job.findMany({
    where,
    orderBy: [{ sourceNotification: { fetchedAt: "desc" } }, { updatedAt: "desc" }],
    skip,
    take,
    include: {
      details: true,
      links: true,
    },
  });

  const payload = rows.map((row) => ({
    slug: row.slug,
    organization: row.organization,
    examName: row.examName,
    applyLastDate: row.details?.applyLastDate ?? row.applyEnd,
    vacancyTotal: row.details?.vacancyTotal ?? row.vacancies,
    notificationPdfUrl: row.notificationPdfUrl ?? row.officialNotificationUrl,
    applyUrlPrimary:
      row.links.find((link) => link.kind === "apply" && link.isPrimary)?.url ??
      row.applyOnlineUrl ??
      null,

    // Backward-compatible fields for unchanged UI components.
    id: row.id,
    title: row.examName,
    category: row.category,
    state: row.state,
    applyStart: row.details?.applyBegin ?? row.applyStart,
    applyEnd: row.details?.applyLastDate ?? row.applyEnd,
    vacancies: row.details?.vacancyTotal ?? row.vacancies,
    officialNotificationUrl: row.notificationPdfUrl ?? row.officialNotificationUrl,
    applyOnlineUrl:
      row.links.find((link) => link.kind === "apply" && link.isPrimary)?.url ??
      row.applyOnlineUrl ??
      null,
    status: row.status,
    updatedAt: row.updatedAt,
  }));

  return NextResponse.json(payload);
}
