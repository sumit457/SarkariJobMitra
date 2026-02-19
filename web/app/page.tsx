"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchJobs, fetchJobsAll, isInActiveCycle, sortActiveCycleJobs, sortJobsLatest } from "@/lib/api";
import {
  ACTIVE_HOME_JOBS,
  ADMISSION_ITEMS,
  ADMIT_CARD_ITEMS,
  RESULT_ITEMS,
} from "@/lib/jobs-data";

const BRAND = "SarkariJobMitra";
const DEFAULT_VISIBLE_ITEMS = 25;

type CardLinkItem = {
  label: string;
  href: string;
  newTab?: boolean;
};

const ACTIVE_JOB_LINKS: CardLinkItem[] = ACTIVE_HOME_JOBS.map((job) => ({
  label: job.title,
  href: `/jobs/${job.id}`,
  newTab: true,
}));

function sectionItems(section: string, labels: string[]): CardLinkItem[] {
  return labels.map((label) => ({
    label,
    href: `/jobs?section=${section}&q=${encodeURIComponent(label)}`,
  }));
}

const ADMISSION_LINKS = sectionItems("admission", ADMISSION_ITEMS);
const ADMIT_LINKS = sectionItems("admit-card", ADMIT_CARD_ITEMS);
const RESULT_LINKS = sectionItems("result", RESULT_ITEMS);

export default function HomePage() {
  const [activeJobLinks, setActiveJobLinks] = useState<CardLinkItem[]>(ACTIVE_JOB_LINKS);
  const [searchResult, setSearchResult] = useState<{ query: string; items: CardLinkItem[] } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let alive = true;

    async function loadActiveJobs() {
      try {
        const jobs = await fetchJobsAll({ activeOnly: true, maxItems: 1000 });
        if (!alive || !Array.isArray(jobs) || jobs.length === 0) return;
        const activeCycleJobs = sortActiveCycleJobs(jobs.filter(isInActiveCycle));
        if (activeCycleJobs.length === 0) return;
        setActiveJobLinks(
          activeCycleJobs.map((job) => ({
            label: job.title,
            href: `/jobs/${job.slug || job.id}`,
            newTab: true,
          })),
        );
      } catch {
        // Keep fallback links from static list when API is unavailable.
      }
    }

    loadActiveJobs();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) return;

    let alive = true;
    const timer = setTimeout(async () => {
      try {
        const searched = await fetchJobs({
          search: q,
          activeOnly: true,
          limit: 200,
          offset: 0,
        });
        if (!alive) return;

        const cycleMatched = sortActiveCycleJobs(searched.filter(isInActiveCycle));
        const preferred = cycleMatched.length > 0 ? cycleMatched : sortJobsLatest(searched);
        const fallbackLocal = activeJobLinks.filter((item) => item.label.toLowerCase().includes(q.toLowerCase()));
        const items =
          preferred.length > 0
            ? preferred.map((job) => ({
                label: job.title,
                href: `/jobs/${job.slug || job.id}`,
                newTab: true,
              }))
            : fallbackLocal;
        setSearchResult({
          query: q.toLowerCase(),
          items,
        });
      } catch {
        if (!alive) return;
        setSearchResult({
          query: q.toLowerCase(),
          items: [],
        });
      }
    }, 300);

    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [searchQuery, activeJobLinks]);

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filterLinks = (items: CardLinkItem[]) =>
    normalizedQuery.length === 0
      ? items
      : items.filter((item) => item.label.toLowerCase().includes(normalizedQuery));

  const filteredActiveLinks =
    normalizedQuery.length >= 2 && searchResult && searchResult.query === normalizedQuery
      ? searchResult.items
      : filterLinks(activeJobLinks);
  const filteredAdmissionLinks = filterLinks(ADMISSION_LINKS);
  const filteredAdmitLinks = filterLinks(ADMIT_LINKS);
  const filteredResultLinks = filterLinks(RESULT_LINKS);

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
            <Tab href="/jobs" active>
              Job Updates
            </Tab>

            <Tab href="/tools" newTab>
              Tools
            </Tab>

            <Tab href="/jobs?section=admission">College Admission</Tab>
            <TabPlaceholder>Notice</TabPlaceholder>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1700px] px-4 pt-6">
        <div className="rounded-3xl border border-slate-200 bg-gradient-to-r from-white via-slate-50 to-white p-4 shadow-md">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-base font-semibold text-slate-900">Quick Tools</div>
              <div className="text-xs text-slate-600">Open directly in focused mode</div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Shortcut href="/tools?tool=image" label="Image Resize Tool" />
              <Shortcut href="/tools?tool=convert" label="Document Conversion Tool" />
              <Shortcut href="/tools?tool=compress" label="PDF Compressor Tool" />
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-[1700px] px-4 py-6">
        <div className="rounded-3xl border bg-white p-6 shadow-md md:p-8">
          <div className="mb-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <label htmlFor="home-global-search" className="mb-2 block text-sm font-semibold text-slate-900">
              Search Jobs / Admission / Admit Card / Result
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                id="home-global-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type any keyword (e.g. SSC, UP Police, Admit, Result...)"
                className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-500"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Clear
                </button>
              ) : null}
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-4">
            <LinkListCard
              title="Active Jobs"
              items={filteredActiveLinks}
              ctaHref="/jobs"
              ctaLabel="Show all"
              ctaNewTab
            />

            <LinkListCard
              title="Admission"
              items={filteredAdmissionLinks}
              ctaHref="/jobs?section=admission"
              ctaLabel="Show all"
            />

            <LinkListCard
              title="Admit Card"
              items={filteredAdmitLinks}
              ctaHref="/jobs?section=admit-card"
              ctaLabel="Show all"
            />

            <LinkListCard
              title="Result"
              items={filteredResultLinks}
              ctaHref="/jobs?section=result"
              ctaLabel="Show all"
            />
          </div>
        </div>
      </main>

      <footer className="border-t bg-slate-50">
        <div className="mx-auto max-w-[1500px] px-4 py-2 text-center text-xs text-slate-600">
          © {new Date().getFullYear()} {BRAND}. Verify details from official notification.
        </div>
      </footer>
    </div>
  );
}

function Tab({
  href,
  children,
  active,
  newTab,
}: {
  href: string;
  children: React.ReactNode;
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

function Shortcut({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={[
        "rounded-full border border-slate-700/80 bg-white px-4 py-2 text-xs font-semibold text-slate-900 transition-all",
        "whitespace-nowrap hover:-translate-y-[1px] hover:bg-slate-100 hover:shadow-md md:text-sm",
      ].join(" ")}
      title={label}
    >
      {label}
    </Link>
  );
}

function TabPlaceholder({ children }: { children: React.ReactNode }) {
  return (
    <span className="cursor-not-allowed rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-medium text-slate-500">
      {children}
    </span>
  );
}

function LinkListCard({
  title,
  items,
  ctaHref,
  ctaLabel = "Show all",
  ctaNewTab,
}: {
  title: string;
  items: CardLinkItem[];
  ctaHref: string;
  ctaLabel?: string;
  ctaNewTab?: boolean;
}) {
  const visibleItems = items.slice(0, DEFAULT_VISIBLE_ITEMS);

  return (
    <section className="rounded-2xl border bg-white p-5 transition hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="text-base font-semibold text-slate-900">{title}</div>
        <div className="h-9 w-9 rounded-xl bg-slate-100 transition" />
      </div>

      <ul className="mt-4 space-y-2 text-sm">
        {visibleItems.length === 0 ? (
          <li className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            No matching items for current search.
          </li>
        ) : (
          visibleItems.map((item, idx) => (
            <li key={`${item.label}-${idx}`} className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-600" />
              <a
                href={item.href}
                target={item.newTab ? "_blank" : undefined}
                rel={item.newTab ? "noopener noreferrer" : undefined}
                className="min-w-0 break-words font-medium leading-5 text-blue-700 hover:text-blue-800 hover:underline"
                title={item.label}
              >
                {item.label}
              </a>
            </li>
          ))
        )}
      </ul>

      <a
        href={ctaHref}
        target={ctaNewTab ? "_blank" : undefined}
        rel={ctaNewTab ? "noopener noreferrer" : undefined}
        className="mt-4 inline-flex items-center rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-800 hover:bg-slate-100"
      >
        {ctaLabel}
      </a>
    </section>
  );
}
