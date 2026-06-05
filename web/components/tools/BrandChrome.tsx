import Image from "next/image";
import Link from "next/link";

export function BrandHeader() {
  return (
    <header className="border-b border-slate-200 bg-gradient-to-r from-sky-100 via-cyan-50 to-indigo-100 shadow-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
        <Link href="/" className="flex items-center gap-3" aria-label="SarkariJobMitra home">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white bg-white/85 shadow-sm">
            <Image
              src="/brand/sarkarijobmitra-mark.png"
              alt="SarkariJobMitra logo"
              width={48}
              height={48}
              className="h-12 w-12 object-contain"
              priority
            />
          </span>
          <span>
            <span className="block text-2xl font-extrabold tracking-tight sm:text-3xl">
              <span className="text-[#06255f]">Sarkari</span>
              <span className="text-[#1f93c8]">Job</span>
              <span className="text-[#cc4d85]">Mitra</span>
            </span>
            <span className="mt-1 block text-xs font-medium text-slate-600 sm:text-sm">
              Image resize, document conversion, and compression tools
            </span>
          </span>
        </Link>
        <Link
          href="/tools"
          className="hidden rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-amber-300 sm:inline-flex"
        >
          All Tools
        </Link>
      </div>
    </header>
  );
}

export function BrandFooter() {
  return (
    <footer className="border-t border-slate-200 bg-gradient-to-r from-slate-50 via-white to-sky-50 px-4 py-6 text-slate-600">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 text-sm md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Image
            src="/brand/sarkarijobmitra-mark.png"
            alt=""
            width={36}
            height={36}
            className="h-9 w-9 rounded-xl bg-white object-contain"
          />
          <div>
            <p className="font-semibold text-slate-900">© 2026 SarkariJobMitra. All rights reserved.</p>
            <p className="mt-0.5">
              Unauthorized copying, scraping, resale, or redistribution of this product and its tools is prohibited.
            </p>
          </div>
        </div>
        <p className="max-w-xl text-xs leading-5">
          SarkariJobMitra is an independent public utility platform and is not affiliated with any government agency,
          recruitment board, or examination authority.
        </p>
      </div>
    </footer>
  );
}
