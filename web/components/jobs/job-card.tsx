import Link from "next/link";
import type { Job } from "@/lib/api";

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs text-gray-700">
      {children}
    </span>
  );
}

export function JobCard({ job }: { job: Job }) {
  const updateLink = job.latest_notice_pdf_url || job.latest_notice_detail_url || null;

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm hover:shadow-md transition">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <Link
            href={`/jobs/${job.id}`}
            className="block text-base md:text-lg font-semibold leading-snug hover:underline"
          >
            {job.title}
          </Link>

          <div className="mt-2 flex flex-wrap gap-2">
            {job.organization ? <Badge>{job.organization}</Badge> : null}
            {job.state ? <Badge>{job.state}</Badge> : null}
            <Badge>Official</Badge>
            {job.is_updated ? (
              <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
                Updated {job.updated_fields && job.updated_fields.length > 0 ? `(${job.updated_fields.join(", ")})` : ""}
              </span>
            ) : null}
          </div>

          <div className="mt-2 text-sm text-gray-600 break-all">
            <a className="underline" href={job.notice_url} target="_blank" rel="noreferrer">
              Notification link
            </a>
            {job.notification_pdf_url ? (
              <>
                {" "}•{" "}
                <a className="underline" href={job.notification_pdf_url} target="_blank" rel="noreferrer">
                  PDF
                </a>
              </>
            ) : null}
          </div>

          {job.is_updated && job.latest_notice_title && updateLink ? (
            <div className="mt-2 text-sm text-amber-800">
              Latest Update:{" "}
              <a className="underline" href={updateLink} target="_blank" rel="noreferrer">
                {job.latest_notice_title}
              </a>
            </div>
          ) : null}
        </div>

        <div className="flex gap-2 md:flex-col">
          <a
            className="inline-flex items-center justify-center rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            href={job.apply_url || job.notice_url}
            target="_blank"
            rel="noreferrer"
          >
            Apply
          </a>

          <Link
            className="inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-medium hover:bg-gray-50"
            href={`/jobs/${job.id}`}
          >
            Details
          </Link>
        </div>
      </div>
    </div>
  );
}
