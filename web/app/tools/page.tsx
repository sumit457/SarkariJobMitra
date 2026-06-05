"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ImageToolPanel from "@/components/tools/ImageToolPanel";
import ConvertToolPanel from "@/components/tools/ConvertToolPanel";
import CompressToolPanel from "@/components/tools/CompressToolPanel";

type ToolKey = "image" | "convert" | "compress";

const TOOL_KEYS: ToolKey[] = ["image", "convert", "compress"];
const SEO_TOOL_LINKS = [
  { href: "/image-tools/resize-image-to-20kb", label: "Resize Image to 20KB" },
  { href: "/convert/pdf-to-word", label: "PDF to Word" },
  { href: "/convert/jpg-to-pdf", label: "JPG to PDF" },
  { href: "/convert/png-to-pdf", label: "PNG to PDF" },
  { href: "/convert/pdf-to-jpg", label: "PDF to JPG" },
  { href: "/convert/word-to-pdf", label: "Word to PDF" },
  { href: "/compress/pdf", label: "PDF Compressor" },
  { href: "/compress/word", label: "Word Compressor" },
];

const TRUST_POINTS = [
  {
    title: "Private by default",
    text: "Uploaded files are processed only for the selected tool and are not kept as permanent storage.",
  },
  {
    title: "Stable public access",
    text: "Large uploads and unusually high request volume are limited so the service remains reliable for everyone.",
  },
  {
    title: "No login needed",
    text: "Core tools are available directly while the full SarkariJobMitra job platform is prepared separately.",
  },
];

function isToolKey(value: string | null): value is ToolKey {
  return value === "image" || value === "convert" || value === "compress";
}

function ToolsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [workspaceDark, setWorkspaceDark] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("tools_workspace_dark") === "1";
  });

  useEffect(() => {
    localStorage.setItem("tools_workspace_dark", workspaceDark ? "1" : "0");
  }, [workspaceDark]);

  const requestedTool = searchParams.get("tool");
  const isFocusMode = isToolKey(requestedTool);

  const orderedTools = useMemo(() => {
    if (!isFocusMode) return TOOL_KEYS;

    if (requestedTool === "image") return ["compress", "image", "convert"] as ToolKey[];
    if (requestedTool === "convert") return ["image", "convert", "compress"] as ToolKey[];
    return ["convert", "compress", "image"] as ToolKey[];
  }, [isFocusMode, requestedTool]);

  function renderTool(tool: ToolKey) {
    if (tool === "image") return <ImageToolPanel embedded darkOverride={workspaceDark} showThemeToggle={false} />;
    if (tool === "convert") return <ConvertToolPanel embedded darkOverride={workspaceDark} showThemeToggle={false} />;
    return <CompressToolPanel embedded darkOverride={workspaceDark} showThemeToggle={false} />;
  }

  function titleFor(tool: ToolKey) {
    if (tool === "image") return "Image Tool";
    if (tool === "convert") return "Convert Tool";
    return "Compress Tool";
  }

  function focusTool(tool: ToolKey) {
    router.replace(`/tools?tool=${tool}`, { scroll: false });
  }

  return (
    <div className={workspaceDark ? "min-h-screen bg-slate-950" : "min-h-screen bg-slate-100"}>
      <header
        className={
          workspaceDark
            ? "border-b border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-800"
            : "border-b border-slate-200 bg-gradient-to-r from-sky-100 via-cyan-50 to-indigo-100"
        }
      >
        <div className="mx-auto max-w-[1800px] px-4 py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-3">
              <div
                className={[
                  "flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border shadow-sm",
                  workspaceDark ? "border-slate-700 bg-white/95" : "border-white bg-white/80",
                ].join(" ")}
              >
                <Image
                  src="/brand/sarkarijobmitra-mark.png"
                  alt="SarkariJobMitra logo"
                  width={56}
                  height={56}
                  priority
                  className="h-14 w-14 object-contain"
                />
              </div>
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                  <span className={workspaceDark ? "text-slate-100" : "text-[#06255f]"}>Sarkari</span>
                  <span className={workspaceDark ? "text-sky-300" : "text-[#1f93c8]"}>Job</span>
                  <span className={workspaceDark ? "text-pink-300" : "text-[#cc4d85]"}>Mitra</span>
                </h1>
                <p className={`mt-1 text-sm ${workspaceDark ? "text-slate-300" : "text-slate-700"}`}>
                  {isFocusMode
                    ? "Tools Workspace: click a side tool to bring it to center."
                    : "Tools Workspace for image resize, document conversion, and file compression."}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setWorkspaceDark((v) => !v)}
              className={[
                "rounded-full border px-4 py-2 text-sm font-medium transition-all",
                "hover:-translate-y-[1px] hover:shadow-md",
                workspaceDark
                  ? "border-slate-700 bg-slate-800 text-slate-100 hover:border-slate-500"
                  : "border-slate-200 bg-white text-slate-800 hover:border-slate-300",
              ].join(" ")}
              title="Workspace Dark Mode"
            >
              {workspaceDark ? "☀ Light" : "🌙 Dark"}
            </button>
          </div>

          <nav
            aria-label="Popular file tools"
            className={[
              "mt-5 flex flex-wrap gap-2 rounded-2xl border p-3 text-sm",
              workspaceDark
                ? "border-slate-700 bg-slate-900/65"
                : "border-white/70 bg-white/60",
            ].join(" ")}
          >
            <span className={`mr-1 py-2 font-semibold ${workspaceDark ? "text-slate-100" : "text-slate-900"}`}>
              Popular:
            </span>
            {SEO_TOOL_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "rounded-full border px-3 py-2 font-medium transition-colors",
                  workspaceDark
                    ? "border-slate-700 bg-slate-900 text-slate-200 hover:border-amber-400"
                    : "border-slate-200 bg-white text-slate-800 hover:border-amber-300",
                ].join(" ")}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-[1800px] px-4 py-6 lg:py-8">
        {!isFocusMode && (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            {TOOL_KEYS.map((tool) => (
                <section
                key={tool}
                className={[
                  "overflow-hidden rounded-3xl border shadow-[0_12px_35px_rgba(15,23,42,0.08)]",
                  workspaceDark ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-white",
                ].join(" ")}
              >
                <div className={`border-b px-5 py-4 ${workspaceDark ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-slate-50"}`}>
                  <h2 className={`text-base font-semibold md:text-lg ${workspaceDark ? "text-slate-100" : "text-slate-900"}`}>{titleFor(tool)}</h2>
                </div>
                <div className="max-h-[84vh] overflow-y-auto">{renderTool(tool)}</div>
              </section>
            ))}
          </div>
        )}

        {isFocusMode && (
          <div className="grid grid-cols-3 gap-4 lg:gap-6">
            {orderedTools.map((tool, idx) => {
              const centered = idx === 1;
              const sideLeft = idx === 0;

              return (
                <section
                  key={tool}
                  onClick={() => {
                    if (!centered) focusTool(tool);
                  }}
                  role={!centered ? "button" : undefined}
                  tabIndex={!centered ? 0 : undefined}
                  onKeyDown={(e) => {
                    if (!centered) {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        focusTool(tool);
                      }
                    }
                  }}
                  className={[
                    "relative overflow-hidden rounded-3xl border text-left shadow-[0_14px_36px_rgba(15,23,42,0.10)]",
                    "transition-all duration-500 ease-out will-change-transform",
                    workspaceDark ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-white",
                    centered
                      ? "z-20 scale-100 opacity-100 border-sky-400 ring-4 ring-sky-300/80"
                      : sideLeft
                        ? "z-10 scale-95 -translate-x-3 cursor-pointer opacity-45 hover:opacity-60"
                        : "z-10 scale-95 translate-x-3 cursor-pointer opacity-45 hover:opacity-60",
                  ].join(" ")}
                >
                  <div className={`border-b px-4 py-3 ${workspaceDark ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-slate-50"}`}>
                    <h2 className={`text-sm font-semibold lg:text-base ${workspaceDark ? "text-slate-100" : "text-slate-900"}`}>{titleFor(tool)}</h2>
                  </div>
                  <div className="max-h-[82vh] overflow-y-auto">{renderTool(tool)}</div>
                </section>
              );
            })}
          </div>
        )}

        <section
          className={[
            "mt-8 grid gap-4 rounded-3xl border p-5 shadow-sm md:grid-cols-3",
            workspaceDark
              ? "border-slate-800 bg-slate-900 text-slate-300"
              : "border-sky-100 bg-gradient-to-r from-sky-50 via-white to-amber-50 text-slate-700",
          ].join(" ")}
          aria-label="SarkariJobMitra tool safeguards"
        >
          {TRUST_POINTS.map((point) => (
            <div
              key={point.title}
              className={[
                "rounded-2xl border p-4 shadow-sm",
                workspaceDark ? "border-slate-700 bg-slate-950/30" : "border-white/70 bg-white/60",
              ].join(" ")}
            >
              <h2 className={`text-sm font-bold ${workspaceDark ? "text-slate-100" : "text-slate-900"}`}>{point.title}</h2>
              <p className="mt-2 text-sm leading-6">{point.text}</p>
            </div>
          ))}
        </section>
      </main>
      <footer
        className={[
          "border-t px-4 py-6",
          workspaceDark ? "border-slate-800 bg-slate-950 text-slate-400" : "border-slate-200 bg-white text-slate-600",
        ].join(" ")}
      >
        <div className="mx-auto flex max-w-[1800px] flex-col gap-3 text-sm md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/brand/sarkarijobmitra-mark.png"
              alt=""
              width={36}
              height={36}
              className="h-9 w-9 rounded-xl bg-white object-contain"
            />
            <div>
              <p className={`font-semibold ${workspaceDark ? "text-slate-100" : "text-slate-900"}`}>
                © 2026 SarkariJobMitra. All rights reserved.
              </p>
              <p className="mt-0.5">
                Unauthorized copying, scraping, resale, or redistribution of this product and its tools is prohibited.
              </p>
            </div>
          </div>
          <p className="max-w-2xl text-xs leading-5">
            SarkariJobMitra is an independent public utility platform and is not affiliated with any government agency,
            recruitment board, or examination authority.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default function ToolsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-100" />}>
      <ToolsPageContent />
    </Suspense>
  );
}
