"use client";

import { useMemo, useState } from "react";
import type { Job } from "@/lib/api";
import { JobCard } from "./job-card";

function normalize(s: string) {
  return s.toLowerCase().trim();
}

export function JobsPage({ initialJobs }: { initialJobs: Job[] }) {
  const [q, setQ] = useState("");

  const jobs = useMemo(() => {
    const query = normalize(q);
    if (!query) return initialJobs;
    return initialJobs.filter((j) => normalize(j.title).includes(query));
  }, [q, initialJobs]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl border bg-gray-100" />
            <div className="leading-tight">
              <div className="text-sm font-semibold">GovJobs</div>
              <div className="text-xs text-gray-500">Simple. Official. Fast.</div>
            </div>
          </div>

          <a
            className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-gray-50"
            href="#subscribe"
          >
            Subscribe
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="rounded-3xl border bg-white p-6 md:p-10 shadow-sm">
          <h1 className="text-2xl md:text-4xl font-semibold tracking-tight">
            Government jobs — clean, fast, official links.
          </h1>
          <p className="mt-2 text-gray-600">
            Search notifications, open PDFs, and apply from the official source. Built for everyone.
          </p>

          <div className="mt-6 flex flex-col gap-3 md:flex-row">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search: SSC, CGL, CHSL, Stenographer..."
              className="h-11 w-full rounded-2xl border bg-white px-4 text-sm outline-none focus:ring-2 focus:ring-black/10"
            />
            <button className="h-11 rounded-2xl bg-black px-5 text-sm font-medium text-white hover:opacity-90">
              Search
            </button>
          </div>

          <div className="mt-4 text-sm text-gray-500">
            Showing <span className="font-semibold text-gray-900">{jobs.length}</span> jobs
          </div>
        </div>
      </section>

      {/* List */}
      <main className="mx-auto max-w-6xl px-4 pb-16">
        <div className="grid gap-3">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>

        {jobs.length === 0 ? (
          <div className="mt-10 rounded-3xl border bg-white p-10 text-center text-gray-600">
            No jobs found for your search.
          </div>
        ) : null}
      </main>

      <footer id="subscribe" className="border-t bg-white">
        <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-gray-600">
          <div className="font-semibold text-gray-900">Next step:</div>
          WhatsApp / Email notifications (we’ll add this next).
          <div className="mt-2 text-xs text-gray-500">
            Always verify eligibility and dates from the official notification PDF.
          </div>
        </div>
      </footer>
    </div>
  );
}
