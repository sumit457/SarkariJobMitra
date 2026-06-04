"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ImageToolPanel from "@/components/tools/ImageToolPanel";
import ConvertToolPanel from "@/components/tools/ConvertToolPanel";
import CompressToolPanel from "@/components/tools/CompressToolPanel";

type ToolKey = "image" | "convert" | "compress";

const TOOL_KEYS: ToolKey[] = ["image", "convert", "compress"];

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
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className={`text-3xl font-bold tracking-tight ${workspaceDark ? "text-slate-100" : "text-slate-900"}`}>
                Tools Workspace
              </h1>
              <p className={`mt-1 text-sm ${workspaceDark ? "text-slate-300" : "text-slate-700"}`}>
                {isFocusMode
                  ? "Focus mode: click a side tool to bring it to center."
                  : "Use all three tools side-by-side."}
              </p>
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

          <div
            className={[
              "mt-5 grid gap-3 rounded-3xl border p-4 text-sm shadow-sm md:grid-cols-3",
              workspaceDark
                ? "border-slate-800 bg-slate-950/60 text-slate-300"
                : "border-white/70 bg-white/70 text-slate-700",
            ].join(" ")}
          >
            <div>
              <span className={`font-semibold ${workspaceDark ? "text-slate-100" : "text-slate-900"}`}>Private by default.</span>{" "}
              Uploaded files are processed for the selected tool and are not kept as permanent storage.
            </div>
            <div>
              <span className={`font-semibold ${workspaceDark ? "text-slate-100" : "text-slate-900"}`}>Safe launch limits.</span>{" "}
              Large uploads and unusually high request volume are limited to keep the service stable.
            </div>
            <div>
              <span className={`font-semibold ${workspaceDark ? "text-slate-100" : "text-slate-900"}`}>Free phase.</span>{" "}
              This public tools version is free while the full job platform is prepared separately.
            </div>
          </div>
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
      </main>
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
