export type Job = {
  id: string;
  slug?: string | null;
  title: string;
  exam_id?: string | null;
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
  exam_date?: string | null;
  vacancy_count?: number | null;
  salary?: string | null;
  pay_level?: string | null;
  age_limit?: string | null;
  qualification?: string | null;
  exam_centers?: string | null;
  department?: string | null;
  place_of_posting?: string | null;
  category_vacancy?: Record<string, number | null> | null;
  application_fee?: string | null;
  short_description?: string | null;
  detailed_description?: string | null;
  is_verified?: boolean;
  confidence_score?: number | null;
  is_updated?: boolean;
  updated_fields?: string[];
  latest_notice_title?: string | null;
  latest_notice_pdf_url?: string | null;
  latest_notice_detail_url?: string | null;
  latest_notice_date?: string | null;
  published_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type JobHomeSectionKey = "upcoming" | "active" | "deadline-over" | "admit-card" | "result";

export type JobHomeSections = Record<JobHomeSectionKey, Job[]>;

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
  examId?: string | null;
  organization: string;
  examName?: string | null;
  title?: string | null;
  category?: string | null;
  state?: string | null;
  status?: string | null;
  applyStart?: string | null;
  applyEnd?: string | null;
  applyLastDate?: string | null;
  examDate?: string | null;
  vacancyTotal?: number | null;
  vacancies?: number | null;
  shortSummary?: string | null;
  notificationPdfUrl?: string | null;
  officialNotificationUrl?: string | null;
  applyOnlineUrl?: string | null;
  applyUrlPrimary?: string | null;
  publishedOn?: string | null;
  updatedAt?: string | null;
  hasUpdates?: boolean;
  latestUpdateNotice?: {
    title: string;
    pdfUrl?: string | null;
    detailUrl?: string | null;
    publishedOn?: string | null;
    fetchedAt?: string | null;
    updateTypes?: string[];
  } | null;
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
  examDate?: string | null;
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
  positionName?: string | null;
  department?: string | null;
  placeOfPosting?: string | null;
  qualification?: string | null;
  payScale?: string | null;
  examCentres?: string | null;
  categoryVacancy?: {
    general?: number | null;
    obc?: number | null;
    sc?: number | null;
    st?: number | null;
    ews?: number | null;
    total?: number | null;
  } | null;
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
    examId?: string | null;
    publishedOn?: string | null;
  } | null;
  hasUpdates?: boolean;
  latestUpdateNotice?: {
    title: string;
    pdfUrl?: string | null;
    detailUrl?: string | null;
    publishedOn?: string | null;
    fetchedAt?: string | null;
    updateTypes?: string[];
  } | null;
};

const ACTIVE_CYCLE_YEARS = new Set([2025, 2026, 2027]);

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
    exam_id: row.examId || null,
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
    exam_date: row.examDate || null,
    vacancy_count: row.vacancyTotal ?? row.vacancies ?? null,
    short_description: row.shortSummary || null,
    is_updated: Boolean(row.hasUpdates),
    updated_fields: row.latestUpdateNotice?.updateTypes || [],
    latest_notice_title: row.latestUpdateNotice?.title || null,
    latest_notice_pdf_url: row.latestUpdateNotice?.pdfUrl || null,
    latest_notice_detail_url: row.latestUpdateNotice?.detailUrl || null,
    latest_notice_date: row.latestUpdateNotice?.publishedOn || row.latestUpdateNotice?.fetchedAt || null,
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
    exam_id: detail.source?.examId || null,
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
    exam_date: detail.details?.examDate || null,
    vacancy_count: detail.details?.vacancyTotal ?? null,
    department: detail.details?.department || null,
    place_of_posting: detail.details?.placeOfPosting || null,
    age_limit: age,
    qualification: detail.details?.qualification || null,
    salary: detail.details?.payScale || null,
    exam_centers: detail.details?.examCentres || detail.details?.placeOfPosting || null,
    category_vacancy: detail.details?.categoryVacancy || null,
    application_fee: fee,
    short_description: detail.details?.shortSummary || null,
    is_updated: Boolean(detail.hasUpdates),
    updated_fields: detail.latestUpdateNotice?.updateTypes || [],
    latest_notice_title: detail.latestUpdateNotice?.title || null,
    latest_notice_pdf_url: detail.latestUpdateNotice?.pdfUrl || null,
    latest_notice_detail_url: detail.latestUpdateNotice?.detailUrl || null,
    latest_notice_date: detail.latestUpdateNotice?.publishedOn || detail.latestUpdateNotice?.fetchedAt || null,
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

function normalizeCategory(category?: string | null) {
  return (category ?? "").trim().toLowerCase();
}

function parseDateMs(value?: string | null) {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function compareDateAsc(left?: string | null, right?: string | null) {
  const leftMs = parseDateMs(left);
  const rightMs = parseDateMs(right);
  if (leftMs === null && rightMs === null) return 0;
  if (leftMs === null) return 1;
  if (rightMs === null) return -1;
  return leftMs - rightMs;
}

function compareDateDesc(left?: string | null, right?: string | null) {
  return compareDateAsc(right, left);
}

function latestSortTimestamp(job: Job) {
  return parseDateMs(job.published_at) ?? parseDateMs(job.opening_date) ?? parseDateMs(job.created_at) ?? 0;
}

export function isRecruitmentJob(job: Job) {
  const category = normalizeCategory(job.category);
  return category === "" || category === "recruitment";
}

export function isAdmitCardJob(job: Job) {
  return normalizeCategory(job.category) === "admit card";
}

export function isResultJob(job: Job) {
  return normalizeCategory(job.category) === "result";
}

export function getRecruitmentSection(job: Job, now = new Date()): Extract<JobHomeSectionKey, "upcoming" | "active" | "deadline-over"> | null {
  if (!isRecruitmentJob(job)) return null;

  const nowMs = now.getTime();
  const openingMs = parseDateMs(job.opening_date);
  const closingMs = parseDateMs(job.closing_date);

  if (job.status === "upcoming") return "upcoming";
  if (job.status === "expired") return "deadline-over";
  if (openingMs !== null && openingMs > nowMs) return "upcoming";
  if (closingMs !== null && closingMs < nowMs) return "deadline-over";
  return "active";
}

export function sortUpcomingJobs(jobs: Job[]): Job[] {
  return [...jobs].sort((a, b) => {
    const openingCmp = compareDateAsc(a.opening_date, b.opening_date);
    if (openingCmp !== 0) return openingCmp;
    return latestSortTimestamp(b) - latestSortTimestamp(a);
  });
}

export function sortApplyNowJobs(jobs: Job[]): Job[] {
  return [...jobs].sort((a, b) => {
    const deadlineCmp = compareDateAsc(a.closing_date, b.closing_date);
    if (deadlineCmp !== 0) return deadlineCmp;
    const openingCmp = compareDateDesc(a.opening_date, b.opening_date);
    if (openingCmp !== 0) return openingCmp;
    return latestSortTimestamp(b) - latestSortTimestamp(a);
  });
}

export function sortDeadlineOverJobs(jobs: Job[]): Job[] {
  return [...jobs].sort((a, b) => {
    const closedCmp = compareDateDesc(a.closing_date, b.closing_date);
    if (closedCmp !== 0) return closedCmp;
    return latestSortTimestamp(b) - latestSortTimestamp(a);
  });
}

export function buildJobHomeSections(jobs: Job[], now = new Date()): JobHomeSections {
  const sections: JobHomeSections = {
    upcoming: [],
    active: [],
    "deadline-over": [],
    "admit-card": [],
    result: [],
  };

  for (const job of jobs) {
    if (isAdmitCardJob(job)) {
      sections["admit-card"].push(job);
      continue;
    }

    if (isResultJob(job)) {
      sections.result.push(job);
      continue;
    }

    const recruitmentSection = getRecruitmentSection(job, now);
    if (recruitmentSection) {
      sections[recruitmentSection].push(job);
    }
  }

  return {
    upcoming: sortUpcomingJobs(sections.upcoming),
    active: sortApplyNowJobs(sections.active),
    "deadline-over": sortDeadlineOverJobs(sections["deadline-over"]),
    "admit-card": sortJobsLatest(sections["admit-card"]),
    result: sortJobsLatest(sections.result),
  };
}
