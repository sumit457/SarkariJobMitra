import type { ReactNode } from "react";
import Link from "next/link";
import { fetchJobs, fetchJobsAll, isInActiveCycle, sortActiveCycleJobs, sortJobsLatest } from "@/lib/api";
import {
  ACTIVE_HOME_JOBS,
  ADMISSION_ITEMS,
  ADMIT_CARD_ITEMS,
  RESULT_ITEMS,
} from "@/lib/jobs-data";

const BRAND = "SarkariJobMitra";

type SectionKey = "jobs" | "admission" | "admit-card" | "result";

type JobsPageProps = {
  searchParams?: {
    section?: string | string[];
    q?: string | string[];
  };
};

type LinkItem = {
  label: string;
  href: string;
  openInNewTab?: boolean;
};

function toSingle(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function toSection(value: string): SectionKey {
  if (value === "admission") return "admission";
  if (value === "admit-card") return "admit-card";
  if (value === "result") return "result";
  return "jobs";
}

function makeSectionItems(section: Exclude<SectionKey, "jobs">, labels: string[]): LinkItem[] {
  return labels.map((label) => ({
    label,
    href: `/jobs?section=${section}&q=${encodeURIComponent(label)}`,
  }));
}

const SECTION_META: Record<SectionKey, { title: string; description: string }> = {
  jobs: {
    title: "All Active Jobs",
    description: "Click a job title to open full details like dates, vacancy, eligibility, salary, and process.",
  },
  admission: {
    title: "College Admission",
    description: "All college admission updates are listed below.",
  },
  "admit-card": {
    title: "Admit Cards",
    description: "All admit card updates are listed below.",
  },
  result: {
    title: "Results",
    description: "All result updates are listed below.",
  },
};

const SECTION_LINKS: Record<SectionKey, LinkItem[]> = {
  jobs: ACTIVE_HOME_JOBS.map((job) => ({
    label: job.title,
    href: `/jobs/${job.id}`,
  })),
  admission: makeSectionItems("admission", ADMISSION_ITEMS),
  "admit-card": makeSectionItems("admit-card", ADMIT_CARD_ITEMS),
  result: makeSectionItems("result", RESULT_ITEMS),
};

export default async function JobsListingPage({ searchParams }: JobsPageProps) {
  const section = toSection(toSingle(searchParams?.section));
  const query = toSingle(searchParams?.q).trim();
  let jobsSectionList: LinkItem[] = [];

  try {
    const apiJobs = query
      ? await fetchJobs({ search: query, activeOnly: true, limit: 200, offset: 0 })
      : await fetchJobsAll({ activeOnly: true, maxItems: 1000 });
    const cycle = sortActiveCycleJobs(apiJobs.filter(isInActiveCycle));
    const preferred = cycle.length > 0 ? cycle : query ? sortJobsLatest(apiJobs) : [];
    jobsSectionList = preferred.map((job) => ({
      label: job.title,
      href: `/jobs/${job.slug || job.id}`,
    }));
    if (jobsSectionList.length === 0) {
      jobsSectionList = SECTION_LINKS.jobs;
    }
  } catch {
    jobsSectionList = ACTIVE_HOME_JOBS.map((job) => ({
      label: job.title,
      href: `/jobs/${job.id}`,
    }));
  }

  const list = section === "jobs" ? jobsSectionList : SECTION_LINKS[section];
  const filtered = section === "jobs" ? list : query ? list.filter((item) => item.label.toLowerCase().includes(query.toLowerCase())) : list;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-gradient-to-r from-sky-50 to-indigo-50">
        <div className="mx-auto max-w-[1500px] px-4 py-4">
          <div className="flex items-center gap-3">
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
              <div className="text-sm text-slate-700">Jobs • Admit Card • Result</div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <HeaderTab href="/jobs" active={section === "jobs"}>
              Job Updates
            </HeaderTab>
            <HeaderTab href="/tools" newTab>
              Tools
            </HeaderTab>
            <HeaderTab href="/jobs?section=admission" active={section === "admission"}>
              College Admission
            </HeaderTab>
            <HeaderTabPlaceholder>Notice</HeaderTabPlaceholder>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 md:py-8">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="text-sm text-slate-600">
            <Link href="/" className="font-medium text-slate-700 hover:underline">
              Home
            </Link>
            <span className="px-2">/</span>
            <span className="font-semibold text-slate-900">{SECTION_META[section].title}</span>
          </div>

          <h1 className="mt-2 text-3xl font-bold text-slate-900 md:text-4xl">{SECTION_META[section].title}</h1>
          <p className="mt-2 text-base text-slate-700">{SECTION_META[section].description}</p>

          <form method="get" className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <input type="hidden" name="section" value={section} />
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                name="q"
                defaultValue={query}
                placeholder={`Search in ${SECTION_META[section].title}`}
                className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-500"
              />
              <button
                type="submit"
                className="h-11 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Search
              </button>
              {query ? (
                <Link
                  href={section === "jobs" ? "/jobs" : `/jobs?section=${section}`}
                  className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100 inline-flex items-center justify-center"
                >
                  Clear
                </Link>
              ) : null}
            </div>
          </form>

          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {filtered.map((item, index) => (
              <li key={`${item.label}-${index}`}>
                <a
                  href={item.href}
                  target={item.openInNewTab ? "_blank" : undefined}
                  rel={item.openInNewTab ? "noopener noreferrer" : undefined}
                  className="flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-blue-700 transition hover:bg-blue-100 hover:text-blue-800"
                >
                  <span className="text-xs font-semibold text-slate-500">{String(index + 1).padStart(2, "0")}</span>
                  <span className="font-semibold underline underline-offset-2">{item.label}</span>
                </a>
              </li>
            ))}
          </ul>

          {filtered.length === 0 ? (
            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
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

function HeaderTabPlaceholder({ children }: { children: ReactNode }) {
  return (
    <span className="cursor-not-allowed rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-medium text-slate-500">
      {children}
    </span>
  );
}
