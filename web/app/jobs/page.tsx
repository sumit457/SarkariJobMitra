import type { ReactNode } from "react";
import Link from "next/link";
import { buildJobHomeSections, fetchJobs, fetchJobsAll, type Job, type JobHomeSectionKey } from "@/lib/api";
import { ACTIVE_HOME_JOBS, ADMISSION_ITEMS } from "@/lib/jobs-data";

const BRAND = "SarkariJobMitra";

type DynamicSectionKey = JobHomeSectionKey;
type SectionKey = DynamicSectionKey | "admission";

type JobsPageProps = {
  searchParams?: Promise<{
    section?: string | string[];
    q?: string | string[];
  }>;
};

type LinkItem = {
  label: string;
  href: string;
  openInNewTab?: boolean;
};

type SectionLinks = Record<DynamicSectionKey, LinkItem[]>;

const SECTION_META: Record<SectionKey, { title: string; description: string }> = {
  upcoming: {
    title: "Coming Soon Jobs",
    description: "These jobs are announced, but the application form has not started yet.",
  },
  active: {
    title: "Apply Now Jobs",
    description: "These jobs are open for application right now.",
  },
  "deadline-over": {
    title: "Last Date Over Jobs",
    description: "These jobs were announced earlier, but their application last date has passed.",
  },
  "admit-card": {
    title: "Admit Cards",
    description: "Download hall ticket and exam entry card updates from official notices.",
  },
  result: {
    title: "Results",
    description: "Result, merit list, and final selection updates are listed here.",
  },
  admission: {
    title: "College Admission",
    description: "All college admission updates are listed below.",
  },
};

const SECTION_PILLS: Array<{ key: DynamicSectionKey; label: string }> = [
  { key: "upcoming", label: "Coming Soon" },
  { key: "active", label: "Apply Now" },
  { key: "deadline-over", label: "Last Date Over" },
  { key: "admit-card", label: "Admit Card" },
  { key: "result", label: "Results" },
];

function makeSectionItems(section: string, labels: string[]): LinkItem[] {
  return labels.map((label) => ({
    label,
    href: `/jobs?section=${section}&q=${encodeURIComponent(label)}`,
  }));
}

function fallbackDynamicSections(): SectionLinks {
  return {
    upcoming: [],
    active: ACTIVE_HOME_JOBS.map((job) => ({
      label: job.title,
      href: `/jobs/${job.id}`,
    })),
    "deadline-over": [],
    "admit-card": [],
    result: [],
  };
}

function toSingle(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function toSection(value: string): SectionKey {
  if (value === "upcoming") return "upcoming";
  if (value === "deadline-over") return "deadline-over";
  if (value === "admit-card") return "admit-card";
  if (value === "result") return "result";
  if (value === "admission") return "admission";
  return "active";
}

function toJobLinks(jobs: Job[]): LinkItem[] {
  return jobs.map((job) => ({
    label: job.title,
    href: `/jobs/${job.slug || job.id}`,
  }));
}

function buildDynamicSections(jobs: Job[]): SectionLinks {
  const grouped = buildJobHomeSections(jobs);
  return {
    upcoming: toJobLinks(grouped.upcoming),
    active: toJobLinks(grouped.active),
    "deadline-over": toJobLinks(grouped["deadline-over"]),
    "admit-card": toJobLinks(grouped["admit-card"]),
    result: toJobLinks(grouped.result),
  };
}

export default async function JobsListingPage({ searchParams }: JobsPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const section = toSection(toSingle(resolvedSearchParams.section));
  const query = toSingle(resolvedSearchParams.q).trim();
  let dynamicSections = fallbackDynamicSections();

  try {
    const apiJobs = query
      ? await fetchJobs({ search: query, activeOnly: false, limit: 200, offset: 0 })
      : await fetchJobsAll({ activeOnly: false, maxItems: 1000 });
    if (Array.isArray(apiJobs) && apiJobs.length > 0) {
      dynamicSections = buildDynamicSections(apiJobs);
    }
  } catch {
    dynamicSections = fallbackDynamicSections();
  }

  const admissionList = query
    ? makeSectionItems("admission", ADMISSION_ITEMS).filter((item) =>
        item.label.toLowerCase().includes(query.toLowerCase()),
      )
    : makeSectionItems("admission", ADMISSION_ITEMS);

  const list = section === "admission" ? admissionList : dynamicSections[section];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-gradient-to-r from-sky-50 to-indigo-50">
        <div className="mx-auto max-w-[1500px] px-4 py-4">
          <Link href="/" className="inline-flex items-center gap-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/40">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-indigo-600 to-sky-500 shadow-sm">
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="h-5 w-5 text-white"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="7" width="18" height="13" rx="2" />
                <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <path d="m9 14 2 2 4-4" />
              </svg>
            </div>
            <div>
              <div className="text-xl font-bold tracking-tight text-slate-900">{BRAND}</div>
              <div className="text-sm text-slate-700">Coming Soon • Apply Now • Admit Card • Result</div>
            </div>
          </Link>

          <div className="mt-4 flex flex-wrap gap-2">
            <HeaderTab href="/" active={section !== "admission"}>
              Job Updates
            </HeaderTab>
            <HeaderTab href="/tools" newTab>
              Tools
            </HeaderTab>
            <HeaderTab href="/jobs?section=admission" active={section === "admission"}>
              College Admission
            </HeaderTab>
            <HeaderTab href="/notices">Notice</HeaderTab>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 md:py-8">
        <section className="rounded-3xl border border-[#d7e3f7] bg-gradient-to-br from-white via-[#f8fbff] to-[#eef4ff] p-6 shadow-[0_20px_60px_-40px_rgba(30,58,138,0.35)] md:p-8">
          <div className="text-sm text-slate-600">
            <Link href="/" className="font-medium text-slate-700 hover:underline">
              Home
            </Link>
            <span className="px-2">/</span>
            <span className="font-semibold text-slate-900">{SECTION_META[section].title}</span>
          </div>

          <h1 className="mt-2 text-3xl font-bold text-slate-900 md:text-4xl">{SECTION_META[section].title}</h1>
          <p className="mt-2 text-base text-slate-700">{SECTION_META[section].description}</p>

          {section !== "admission" ? (
            <div className="mt-5 flex flex-wrap gap-2">
              {SECTION_PILLS.map((item) => (
                <Link
                  key={item.key}
                  href={`/jobs?section=${item.key}`}
                  className={[
                    "rounded-full border px-4 py-2 text-sm font-semibold transition",
                    section === item.key
                      ? "border-[#172554] bg-[#172554] text-white shadow-sm"
                      : "border-[#bfd0f3] bg-white text-[#1d4ed8] hover:border-[#93b0e8] hover:bg-[#edf4ff]",
                  ].join(" ")}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          ) : null}

          <form method="get" className="mt-4 rounded-2xl border border-[#d7e3f7] bg-white/80 p-3 shadow-sm">
            <input type="hidden" name="section" value={section} />
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                name="q"
                defaultValue={query}
                placeholder={`Search in ${SECTION_META[section].title}`}
                className="h-11 w-full rounded-xl border border-[#c9d8f3] bg-white px-3 text-sm text-slate-900 outline-none focus:border-[#2563eb]"
              />
              <button
                type="submit"
                className="h-11 rounded-xl bg-[#172554] px-5 text-sm font-semibold text-white hover:bg-[#1e3a8a]"
              >
                Search
              </button>
              {query ? (
                <Link
                  href={section === "admission" ? "/jobs?section=admission" : `/jobs?section=${section}`}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-[#bfd0f3] bg-[#edf4ff] px-4 text-sm font-semibold text-[#1e3a8a] hover:bg-[#dbe7ff]"
                >
                  Clear
                </Link>
              ) : null}
            </div>
          </form>

          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {list.map((item, index) => (
              <li key={`${item.label}-${index}`}>
                <a
                  href={item.href}
                  target={item.openInNewTab ? "_blank" : undefined}
                  rel={item.openInNewTab ? "noopener noreferrer" : undefined}
                  className="flex items-center gap-3 rounded-2xl border border-[#c9d8f3] bg-gradient-to-r from-[#f7faff] to-white px-4 py-3 text-[#1d4ed8] shadow-sm transition hover:-translate-y-[1px] hover:border-[#93b0e8] hover:shadow-md hover:text-[#1e40af]"
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#eaf1ff] text-xs font-bold text-[#1e3a8a]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="font-semibold underline underline-offset-2">{item.label}</span>
                </a>
              </li>
            ))}
          </ul>

          {list.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-[#d7e3f7] bg-white/80 px-4 py-3 text-sm text-slate-700 shadow-sm">
              No links found for this section.
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}

function HeaderTab({
  href,
  children,
  active,
  newTab,
}: {
  href: string;
  children: ReactNode;
  active?: boolean;
  newTab?: boolean;
}) {
  return (
    <Link
      href={href}
      target={newTab ? "_blank" : undefined}
      rel={newTab ? "noopener noreferrer" : undefined}
      className={[
        "rounded-full px-4 py-2 text-sm font-medium transition",
        active ? "bg-slate-900 text-white" : "border bg-white text-slate-700 hover:bg-slate-50",
      ].join(" ")}
    >
      {children}
    </Link>
  );
}
