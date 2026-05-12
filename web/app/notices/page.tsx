"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type NoticeAgency = {
  agency: string;
  count: number;
};

type NoticeItem = {
  id: string;
  agency: string;
  sourceKey: string;
  sourceName: string;
  examId?: string | null;
  title: string;
  publishedOn?: string | null;
  sourceSession?: string | null;
  sourceOpenDate?: string | null;
  sourceCloseDate?: string | null;
  detailUrl?: string | null;
  pdfUrl?: string | null;
  applyUrl?: string | null;
  officialPageUrl?: string | null;
  pdfSha256?: string | null;
  pdfBytes?: number | null;
  storagePath?: string | null;
  pdfTextExtracted?: boolean;
  fetchedAt: string;
  status: string;
  error?: string | null;
};

type NoticeApiResponse = {
  total: number;
  limit: number;
  offset: number;
  year: number | null;
  agency: string | null;
  agencies: NoticeAgency[];
  items: NoticeItem[];
};

const DEFAULT_AGENCIES = ["SSC", "SBI", "UPSC", "India Post"];
const DEFAULT_YEAR = 2026;

function isNewNotice(publishedOn?: string | null, fetchedAt?: string | null) {
  const basis = new Date(publishedOn || fetchedAt || 0).getTime();
  if (!basis) return false;
  const ageMs = Date.now() - basis;
  return ageMs >= 0 && ageMs <= 3 * 24 * 60 * 60 * 1000;
}

function asDateLabel(value?: string | null) {
  if (!value) return { day: "--", month: "", year: "" };
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return { day: "--", month: "", year: "" };
  return {
    day: dt.toLocaleDateString("en-GB", { day: "2-digit" }),
    month: dt.toLocaleDateString("en-GB", { month: "short" }),
    year: dt.toLocaleDateString("en-GB", { year: "numeric" }),
  };
}

function fileSizeLabel(bytes?: number | null) {
  if (!bytes || bytes <= 0) return "--";
  return `(${(bytes / 1024).toFixed(2)} KB)`;
}

export default function NoticesPage() {
  const [agency, setAgency] = useState("SSC");
  const [year, setYear] = useState(DEFAULT_YEAR);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [response, setResponse] = useState<NoticeApiResponse | null>(null);

  useEffect(() => {
    let active = true;

    const params = new URLSearchParams();
    params.set("agency", agency);
    params.set("year", String(year));
    params.set("limit", "500");

    fetch(`/api/notifications?${params.toString()}`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`Failed to fetch notices (${res.status})`);
        }
        return (await res.json()) as NoticeApiResponse;
      })
      .then((payload) => {
        if (!active) return;
        setResponse(payload);
        setError("");
      })
      .catch((err) => {
        if (!active) return;
        setError(String((err as Error)?.message ?? err));
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [agency, year]);

  const agencies = useMemo(() => {
    const dynamic = (response?.agencies ?? []).map((entry) => entry.agency);
    const merged = [...DEFAULT_AGENCIES, ...dynamic];
    return Array.from(new Set(merged));
  }, [response?.agencies]);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-gradient-to-r from-sky-50 to-indigo-50">
        <div className="mx-auto max-w-[1500px] px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-indigo-600 to-sky-500 shadow-sm" />
            <div>
              <div className="text-xl font-bold tracking-tight text-slate-900">SarkariJobMitra</div>
              <div className="text-sm text-slate-700">Agency Notices</div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Tab href="/jobs">Job Updates</Tab>
            <Tab href="/tools" newTab>
              Tools
            </Tab>
            <Tab href="/jobs?section=admission">College Admission</Tab>
            <Tab href="/notices" active>
              Notice
            </Tab>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] px-4 py-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Official Notices</h1>
              <p className="text-sm text-slate-600">Select an agency from the left. For SSC, this lists 2026 notices with direct PDF links.</p>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-semibold text-slate-700" htmlFor="notice-year">
                Year
              </label>
              <select
                id="notice-year"
                value={year}
                onChange={(e) => {
                  setLoading(true);
                  setError("");
                  setYear(Number(e.target.value));
                }}
                className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900"
              >
                {[2027, 2026, 2025, 2024].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-[230px_minmax(0,1fr)]">
            <aside className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="mb-2 px-2 text-xs font-bold uppercase tracking-wide text-slate-500">Exam Agencies</div>
              <div className="space-y-2">
                {agencies.map((name) => {
                  const count = response?.agencies?.find((entry) => entry.agency === name)?.count ?? 0;
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => {
                        setLoading(true);
                        setError("");
                        setAgency(name);
                      }}
                      className={[
                        "flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm font-semibold transition",
                        agency === name
                          ? "border-slate-800 bg-slate-900 text-white"
                          : "border-slate-300 bg-white text-slate-800 hover:bg-slate-100",
                      ].join(" ")}
                    >
                      <span>{name}</span>
                      <span className={agency === name ? "text-slate-200" : "text-slate-500"}>{count}</span>
                    </button>
                  );
                })}
              </div>
            </aside>

            <section className="rounded-2xl border border-slate-200 bg-white">
              <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">
                {agency} Notices ({year})
              </div>

              {loading ? (
                <div className="px-4 py-6 text-sm text-slate-600">Loading notices...</div>
              ) : null}

              {error ? <div className="px-4 py-6 text-sm text-rose-700">{error}</div> : null}

              {!loading && !error && response?.items.length === 0 ? (
                <div className="px-4 py-6 text-sm text-slate-600">No notices found for this filter.</div>
              ) : null}

              {!loading && !error ? (
                <ul className="divide-y divide-slate-100">
                  {(response?.items ?? []).map((item) => {
                    const date = asDateLabel(item.publishedOn || item.fetchedAt);
                    const primaryNoticeUrl = item.pdfUrl || item.detailUrl || item.officialPageUrl || item.applyUrl || "";
                    return (
                      <li key={item.id} className="grid grid-cols-[90px_minmax(0,1fr)_150px] gap-3 px-4 py-4">
                        <div className="text-center">
                          {isNewNotice(item.publishedOn, item.fetchedAt) ? (
                            <div className="mx-auto mb-1 inline-flex rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                              New
                            </div>
                          ) : null}
                          <div className="text-xs text-slate-500">{date.month}</div>
                          <div className="text-2xl font-bold leading-none text-slate-900">{date.day}</div>
                          <div className="text-xs text-slate-500">{date.year}</div>
                        </div>

                        <div className="min-w-0">
                          <a
                            href={primaryNoticeUrl || undefined}
                            target={primaryNoticeUrl ? "_blank" : undefined}
                            rel={primaryNoticeUrl ? "noopener noreferrer" : undefined}
                            className="text-sm font-semibold leading-5 text-slate-900 hover:text-blue-700 hover:underline"
                          >
                            {item.title}
                          </a>
                          <div className="mt-1 text-xs text-slate-500">{item.sourceName}</div>
                        </div>

                        <div className="flex flex-col items-end justify-center gap-1 text-xs text-slate-600">
                          <div>{fileSizeLabel(item.pdfBytes)}</div>
                          {item.pdfUrl ? (
                            <a
                              href={item.pdfUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-full border border-rose-300 bg-rose-50 px-2 py-0.5 font-semibold text-rose-700 hover:bg-rose-100"
                            >
                              PDF
                            </a>
                          ) : null}
                          {primaryNoticeUrl ? (
                            <a
                              href={primaryNoticeUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-full border border-slate-300 bg-slate-50 px-2 py-0.5 font-semibold text-slate-700 hover:bg-slate-100"
                            >
                              View
                            </a>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </section>
          </div>
        </div>
      </main>
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
