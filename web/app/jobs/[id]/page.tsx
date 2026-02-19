import Link from "next/link";
import { fetchJob } from "@/lib/api";
import { buildGenericJobDetail, getJobTitleById, JOB_DETAIL_DATA } from "@/lib/jobs-data";

type Props = {
  params: Promise<{ id: string }>;
};

function ensureAbsoluteUrl(url?: string | null, baseUrl?: string | null): string {
  const raw = (url || "").trim();
  if (!raw) return "";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("/") && baseUrl) {
    try {
      return new URL(raw, baseUrl).toString();
    } catch {
      return "";
    }
  }
  if (raw.startsWith("www.")) return `https://${raw}`;
  return "";
}

function pickFirstValidUrl(candidates: Array<string | null | undefined>, baseUrl?: string | null): string {
  for (const candidate of candidates) {
    const normalized = ensureAbsoluteUrl(candidate, baseUrl);
    if (normalized) return normalized;
  }
  return "";
}

function formatDateLabel(input?: string | null): string {
  if (!input) return "Not decided yet";
  const dt = new Date(input);
  if (Number.isNaN(dt.getTime())) return input;
  return dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function JobDetailsPage({ params }: Props) {
  const { id } = await params;

  let apiJobTitle = "";
  let apiApply = "";
  let apiNotification = "";
  let apiOpeningDate = "";
  let apiClosingDate = "";
  let apiOrganization = "";
  let apiVacancy = "";
  let apiSalary = "";
  let apiPayLevel = "";
  let apiQualification = "";
  let apiAgeLimit = "";
  let apiExamCenters = "";
  let apiApplicationFee = "";
  let apiCategory = "";
  let apiNoticeUrl = "";

  try {
    const apiJob = await fetchJob(id);
    if (apiJob) {
      apiJobTitle = apiJob.title;
      apiApply = apiJob.official_apply_url || apiJob.apply_url || "";
      apiNotification = apiJob.official_notification_pdf_url || apiJob.notification_pdf_url || apiJob.notice_url || "";
      apiNoticeUrl = apiJob.notice_url || "";
      apiOpeningDate = formatDateLabel(apiJob.opening_date);
      apiClosingDate = formatDateLabel(apiJob.closing_date);
      apiOrganization = apiJob.organization || "";
      apiVacancy = apiJob.vacancy_count ? String(apiJob.vacancy_count) : "";
      apiSalary = apiJob.salary || "";
      apiPayLevel = apiJob.pay_level || "";
      apiQualification = apiJob.qualification || "";
      apiAgeLimit = apiJob.age_limit || "";
      apiExamCenters = apiJob.exam_centers || "";
      apiApplicationFee = apiJob.application_fee || "";
      apiCategory = apiJob.category || "";
    }
  } catch {
    // Keep local fallback details when API is unavailable.
  }

  const baseTitle = getJobTitleById(id) || apiJobTitle || "Job Details";
  const details = JOB_DETAIL_DATA[id] ?? buildGenericJobDetail(id, baseTitle);
  const pageTitle = details.title || baseTitle;
  const applyLink = pickFirstValidUrl([apiApply, details.officialApplyLink, apiNoticeUrl], apiNoticeUrl);
  const notificationLink = pickFirstValidUrl([apiNotification, details.officialNotificationLink, apiNoticeUrl], apiNoticeUrl);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div>
            <div className="text-2xl font-bold tracking-tight text-slate-900">SarkariJobMitra</div>
            <div className="text-sm text-slate-700">Active Job Details</div>
          </div>

          <Link
            href="/"
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100"
          >
            Back to Home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 md:py-8">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="text-sm text-slate-600">
            <Link href="/" className="font-medium text-slate-700 hover:underline">
              Home
            </Link>
            <span className="px-2">/</span>
            <Link href="/jobs" className="font-medium text-slate-700 hover:underline">
              Jobs
            </Link>
            <span className="px-2">/</span>
            <span className="font-semibold text-slate-900">{id}</span>
          </div>

          <h1 className="mt-3 text-3xl font-bold text-slate-900 md:text-4xl">{pageTitle}</h1>
          <p className="mt-2 text-base text-slate-700">
            Full job detail structure. Update values as soon as official notifications are released.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h2 className="text-lg font-bold text-slate-900">Job Snapshot</h2>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="font-semibold text-slate-700">Job Name</dt>
                  <dd className="text-right text-slate-900">{details.title}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="font-semibold text-slate-700">Department</dt>
                  <dd className="text-right text-slate-900">{apiOrganization || details.departmentName}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="font-semibold text-slate-700">Total Vacancy</dt>
                  <dd className="text-right text-slate-900">{apiVacancy || details.totalVacancy}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="font-semibold text-slate-700">Exam Agency</dt>
                  <dd className="text-right text-slate-900">{details.examAgency}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="font-semibold text-slate-700">Government Level</dt>
                  <dd className="text-right text-slate-900">{details.level}</dd>
                </div>
                {apiCategory ? (
                  <div className="flex justify-between gap-3">
                    <dt className="font-semibold text-slate-700">Category</dt>
                    <dd className="text-right text-slate-900">{apiCategory}</dd>
                  </div>
                ) : null}
              </dl>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h2 className="text-lg font-bold text-slate-900">Important Dates</h2>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="font-semibold text-slate-700">Opening Date</dt>
                  <dd className="text-right text-slate-900">{apiOpeningDate || details.openingDate}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="font-semibold text-slate-700">Closing Date</dt>
                  <dd className="text-right text-slate-900">{apiClosingDate || details.closingDate}</dd>
                </div>
                {apiApplicationFee ? (
                  <div className="flex justify-between gap-3">
                    <dt className="font-semibold text-slate-700">Application Fee</dt>
                    <dd className="text-right text-slate-900">{apiApplicationFee}</dd>
                  </div>
                ) : null}
              </dl>

              <div className="mt-5 space-y-2">
                {notificationLink ? (
                  <a
                    href={notificationLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                  >
                    Official Notification
                  </a>
                ) : (
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
                    Official Notification: Not available yet
                  </div>
                )}

                {applyLink ? (
                  <a
                    href={applyLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
                  >
                    Official Apply Link
                  </a>
                ) : (
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
                    Official Apply Link: Not available yet
                  </div>
                )}
              </div>
            </section>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h2 className="text-lg font-bold text-slate-900">Eligibility Criteria</h2>
              {apiQualification || apiAgeLimit ? (
                <ul className="mb-3 space-y-2 text-sm text-slate-800">
                  {apiQualification ? (
                    <li className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                      <span className="font-semibold">Qualification:</span> {apiQualification}
                    </li>
                  ) : null}
                  {apiAgeLimit ? (
                    <li className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                      <span className="font-semibold">Age Limit:</span> {apiAgeLimit}
                    </li>
                  ) : null}
                </ul>
              ) : null}
              <ul className="mt-3 space-y-2 text-sm text-slate-800">
                {details.eligibility.map((item) => (
                  <li key={item.label} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                    <span className="font-semibold">{item.label}:</span> {item.value}
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h2 className="text-lg font-bold text-slate-900">Salary Details</h2>
              {apiSalary || apiPayLevel ? (
                <ul className="mb-3 space-y-2 text-sm text-slate-800">
                  {apiSalary ? (
                    <li className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                      <span className="font-semibold">Salary:</span> {apiSalary}
                    </li>
                  ) : null}
                  {apiPayLevel ? (
                    <li className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                      <span className="font-semibold">Pay Level:</span> {apiPayLevel}
                    </li>
                  ) : null}
                </ul>
              ) : null}
              <ul className="mt-3 space-y-2 text-sm text-slate-800">
                {details.salary.map((item) => (
                  <li key={item.label} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                    <span className="font-semibold">{item.label}:</span> {item.value}
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h2 className="text-lg font-bold text-slate-900">Exam Centres</h2>
              {apiExamCenters ? (
                <p className="mb-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800">
                  {apiExamCenters}
                </p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                {details.examCentres.map((centre) => (
                  <span key={centre} className="rounded-full border border-slate-300 bg-white px-3 py-1 text-sm text-slate-800">
                    {centre}
                  </span>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h2 className="text-lg font-bold text-slate-900">Category Wise Vacancy</h2>
              <ul className="mt-3 space-y-2 text-sm text-slate-800">
                {details.categoryVacancy.map((item) => (
                  <li key={item.key} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
                    <span className="font-semibold">{item.key}</span>
                    <span>{item.value}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h2 className="text-lg font-bold text-slate-900">State-wise Vacancy Distribution</h2>
              {details.stateVacancy && details.stateVacancy.length > 0 ? (
                <ul className="mt-3 space-y-2 text-sm text-slate-800">
                  {details.stateVacancy.map((item) => (
                    <li
                      key={item.key}
                      className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2"
                    >
                      <span className="font-semibold">{item.key}</span>
                      <span>{item.value}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                  Not applicable for this job.
                </p>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h2 className="text-lg font-bold text-slate-900">Selection Process Timeline</h2>
              <ul className="mt-3 space-y-2 text-sm text-slate-800">
                {details.processFlow.map((item) => (
                  <li key={item.step} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                    <div className="font-semibold">{item.step}</div>
                    <div className="text-slate-600">{item.statusDate}</div>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
