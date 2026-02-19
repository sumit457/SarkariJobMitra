export type Job = {
  id: string;
  slug?: string | null;
  title: string;
  organization?: string | null;
  category?: string | null;
  state?: string | null;
  status?: string | null;
  is_active?: boolean;
  notice_url: string;
  apply_url?: string | null;
  notification_pdf_url?: string | null;
  official_apply_url?: string | null;
  official_notification_pdf_url?: string | null;
  opening_date?: string | null;
  closing_date?: string | null;
  vacancy_count?: number | null;
  salary?: string | null;
  pay_level?: string | null;
  age_limit?: string | null;
  qualification?: string | null;
  exam_centers?: string | null;
  application_fee?: string | null;
  short_description?: string | null;
  detailed_description?: string | null;
  is_verified?: boolean;
  confidence_score?: number | null;
  published_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type FetchJobsParams = {
  limit?: number;
  offset?: number;
  state?: string;
  organization?: string;
  status?: string;
  search?: string;
  activeOnly?: boolean;
};

type JobsListApiRow = {
  id: string;
  slug: string;
  organization: string;
  examName?: string | null;
  title?: string | null;
  category?: string | null;
  state?: string | null;
  status?: string | null;
  applyStart?: string | null;
  applyEnd?: string | null;
  applyLastDate?: string | null;
  vacancyTotal?: number | null;
  vacancies?: number | null;
  shortSummary?: string | null;
  notificationPdfUrl?: string | null;
  officialNotificationUrl?: string | null;
  applyOnlineUrl?: string | null;
  applyUrlPrimary?: string | null;
  publishedOn?: string | null;
  updatedAt?: string | null;
};

type JobsDetailApiLink = {
  kind: string;
  label: string;
  url: string;
  isPrimary: boolean;
};

type JobsDetailApiDetails = {
  applyBegin?: string | null;
  applyLastDate?: string | null;
  feeLastDate?: string | null;
  correctionFrom?: string | null;
  correctionTo?: string | null;
  feeGeneral?: number | null;
  feeObc?: number | null;
  feeScSt?: number | null;
  feePh?: number | null;
  feeFemale?: number | null;
  feeNote?: string | null;
  ageMin?: number | null;
  ageMax?: number | null;
  ageAsOn?: string | null;
  vacancyTotal?: number | null;
  shortSummary?: string | null;
};

type JobsDetailApiResponse = {
  slug: string;
  organization: string;
  examName: string;
  notificationPdfUrl?: string | null;
  links: JobsDetailApiLink[];
  details?: JobsDetailApiDetails | null;
  source?: {
    publishedOn?: string | null;
  } | null;
};

const ACTIVE_CYCLE_YEARS = new Set([2025, 2026]);

function serverBaseUrl() {
  const port = process.env.PORT || "3000";
  const explicit =
    process.env.INTERNAL_API_BASE || process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || `http://127.0.0.1:${port}`;
  return explicit.replace(/\/+$/, "");
}

function buildApiUrl(path: string, params?: URLSearchParams) {
  if (typeof window !== "undefined") {
    const query = params?.toString();
    return query ? `${path}?${query}` : path;
  }

  const url = new URL(path, serverBaseUrl());
  if (params) {
    url.search = params.toString();
  }
  return url.toString();
}

function applyFetchJobParams(params: FetchJobsParams): URLSearchParams {
  const {
    limit = 50,
    offset = 0,
    state,
    organization,
    status,
    search,
    activeOnly = true,
  } = params;

  const query = new URLSearchParams();
  query.set("limit", String(limit));
  query.set("offset", String(offset));
  query.set("activeOnly", String(activeOnly));
  if (status) query.set("status", status);
  if (state) query.set("state", state);
  if (organization) query.set("organization", organization);
  if (search) query.set("search", search);
  return query;
}

function pickFirstUrl(...candidates: Array<string | null | undefined>) {
  for (const candidate of candidates) {
    if (!candidate) continue;
    const trimmed = candidate.trim();
    if (!trimmed) continue;
    return trimmed;
  }
  return "";
}

function feeSummary(details?: JobsDetailApiDetails | null) {
  if (!details) return null;
  const chunks: string[] = [];
  if (typeof details.feeGeneral === "number") chunks.push(`GEN: Rs ${details.feeGeneral}`);
  if (typeof details.feeObc === "number" && details.feeObc !== details.feeGeneral) chunks.push(`OBC: Rs ${details.feeObc}`);
  if (typeof details.feeScSt === "number") chunks.push(`SC/ST: Rs ${details.feeScSt}`);
  if (typeof details.feePh === "number") chunks.push(`PH: Rs ${details.feePh}`);
  if (typeof details.feeFemale === "number") chunks.push(`Female: Rs ${details.feeFemale}`);
  if (chunks.length > 0) return chunks.join(" | ");
  return details.feeNote ?? null;
}

function ageSummary(details?: JobsDetailApiDetails | null) {
  if (!details) return null;
  const ageParts: string[] = [];
  if (typeof details.ageMin === "number") ageParts.push(`Min ${details.ageMin}`);
  if (typeof details.ageMax === "number") ageParts.push(`Max ${details.ageMax}`);
  if (ageParts.length === 0) return null;
  if (details.ageAsOn) {
    return `${ageParts.join(", ")} (as on ${details.ageAsOn})`;
  }
  return ageParts.join(", ");
}

function toJobFromList(row: JobsListApiRow): Job {
  const notification = pickFirstUrl(row.notificationPdfUrl, row.officialNotificationUrl);
  const apply = pickFirstUrl(row.applyUrlPrimary, row.applyOnlineUrl);
  const notice = pickFirstUrl(notification, apply);

  return {
    id: row.id,
    slug: row.slug,
    title: row.examName || row.title || "Job Update",
    organization: row.organization || null,
    category: row.category || null,
    state: row.state || null,
    status: row.status || null,
    is_active: row.status !== "expired",
    notice_url: notice,
    apply_url: apply || null,
    notification_pdf_url: notification || null,
    official_apply_url: apply || null,
    official_notification_pdf_url: notification || null,
    opening_date: row.applyStart || null,
    closing_date: row.applyLastDate || row.applyEnd || null,
    vacancy_count: row.vacancyTotal ?? row.vacancies ?? null,
    short_description: row.shortSummary || null,
    published_at: row.publishedOn || row.updatedAt || null,
    created_at: row.updatedAt || null,
    updated_at: row.updatedAt || null,
  };
}

function firstLinkByKind(links: JobsDetailApiLink[], kind: string, primaryOnly = false) {
  return (
    links.find((link) => link.kind === kind && (!primaryOnly || link.isPrimary))?.url ||
    links.find((link) => link.kind === kind)?.url ||
    ""
  );
}

function toJobFromDetails(detail: JobsDetailApiResponse): Job {
  const notification = pickFirstUrl(
    firstLinkByKind(detail.links, "notification", true),
    detail.notificationPdfUrl,
  );
  const apply = pickFirstUrl(
    firstLinkByKind(detail.links, "apply", true),
    firstLinkByKind(detail.links, "apply"),
  );
  const notice = pickFirstUrl(notification, apply);
  const fee = feeSummary(detail.details);
  const age = ageSummary(detail.details);

  return {
    id: detail.slug,
    slug: detail.slug,
    title: detail.examName,
    organization: detail.organization,
    status: "active",
    is_active: true,
    notice_url: notice,
    apply_url: apply || null,
    notification_pdf_url: notification || null,
    official_apply_url: apply || null,
    official_notification_pdf_url: notification || null,
    opening_date: detail.details?.applyBegin || null,
    closing_date: detail.details?.applyLastDate || null,
    vacancy_count: detail.details?.vacancyTotal ?? null,
    age_limit: age,
    application_fee: fee,
    short_description: detail.details?.shortSummary || null,
    published_at: detail.source?.publishedOn || null,
    created_at: null,
    updated_at: null,
  };
}

export async function fetchJobs(params: number | FetchJobsParams = 50): Promise<Job[]> {
  const resolved: FetchJobsParams = typeof params === "number" ? { limit: params } : params;
  const query = applyFetchJobParams(resolved);
  const url = buildApiUrl("/api/jobs", query);
  const res = await fetch(url, { cache: "no-store" });

  if (!res.ok) {
    throw new Error(`Failed to fetch jobs (${res.status})`);
  }

  const rows = (await res.json()) as JobsListApiRow[];
  return rows.map(toJobFromList);
}

export async function fetchJobsAll(
  params: Omit<FetchJobsParams, "limit" | "offset"> & {
    pageSize?: number;
    maxItems?: number;
  } = {},
): Promise<Job[]> {
  const pageSize = Math.min(Math.max(params.pageSize ?? 200, 1), 200);
  const maxItems = Math.max(params.maxItems ?? 1000, pageSize);
  const merged: Job[] = [];

  for (let offset = 0; offset < maxItems; offset += pageSize) {
    const batch = await fetchJobs({
      ...params,
      limit: pageSize,
      offset,
    });
    if (batch.length === 0) break;
    merged.push(...batch);
    if (batch.length < pageSize) break;
  }

  return merged.slice(0, maxItems);
}

export async function fetchJob(id: string): Promise<Job | null> {
  const direct = await fetch(buildApiUrl(`/api/jobs/${encodeURIComponent(id)}`), { cache: "no-store" });
  if (direct.ok) {
    const payload = (await direct.json()) as JobsDetailApiResponse;
    return toJobFromDetails(payload);
  }

  const jobs = await fetchJobs({ limit: 200, activeOnly: false });
  return jobs.find((job) => job.id === id || job.slug === id) ?? null;
}

function yearsFromText(value?: string | null): number[] {
  if (!value) return [];
  const matches = value.match(/\b20\d{2}\b/g) || [];
  return matches.map((m) => Number(m)).filter((y) => Number.isFinite(y));
}

function yearFromDate(value?: string | null): number | null {
  if (!value) return null;
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.getFullYear();
}

function collectExplicitYears(job: Job): number[] {
  const values: Array<string | null | undefined> = [
    job.title,
    job.opening_date,
    job.closing_date,
    job.notice_url,
    job.notification_pdf_url,
    job.official_notification_pdf_url,
    job.official_apply_url,
  ];
  const textYears = values.flatMap((value) => yearsFromText(value));
  const dateYears = [yearFromDate(job.opening_date), yearFromDate(job.closing_date)].filter(
    (value): value is number => typeof value === "number",
  );
  return [...textYears, ...dateYears];
}

function collectTemporalYears(job: Job): number[] {
  const years = [yearFromDate(job.published_at), yearFromDate(job.created_at)].filter(
    (value): value is number => typeof value === "number",
  );
  return years;
}

function inferJobYear(job: Job): number | null {
  const explicit = collectExplicitYears(job);
  if (explicit.length > 0) return Math.max(...explicit);

  const years = collectTemporalYears(job);
  if (years.length > 0) return Math.max(...years);
  return null;
}

export function isInActiveCycle(job: Job): boolean {
  const explicitYears = collectExplicitYears(job);
  if (explicitYears.length > 0) {
    return explicitYears.some((year) => ACTIVE_CYCLE_YEARS.has(year));
  }
  const temporalYears = collectTemporalYears(job);
  return temporalYears.some((year) => ACTIVE_CYCLE_YEARS.has(year));
}

export function sortActiveCycleJobs(jobs: Job[]): Job[] {
  return [...jobs].sort((a, b) => {
    const yearA = inferJobYear(a) || 0;
    const yearB = inferJobYear(b) || 0;
    if (yearB !== yearA) return yearB - yearA;

    const timeA = new Date(a.published_at || a.opening_date || a.created_at || 0).getTime() || 0;
    const timeB = new Date(b.published_at || b.opening_date || b.created_at || 0).getTime() || 0;
    return timeB - timeA;
  });
}

export function sortJobsLatest(jobs: Job[]): Job[] {
  return [...jobs].sort((a, b) => {
    const timeA = new Date(a.published_at || a.opening_date || a.created_at || 0).getTime() || 0;
    const timeB = new Date(b.published_at || b.opening_date || b.created_at || 0).getTime() || 0;
    return timeB - timeA;
  });
}
