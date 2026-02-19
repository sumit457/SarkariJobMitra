"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Mode = "pdf" | "word";
type Level = "small" | "balanced" | "high";

function clamp(x: number, a: number, b: number) {
  return Math.max(a, Math.min(b, x));
}

function safeBase(name: string) {
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  return base.replace(/[^\w\-]+/g, "_");
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function errorText(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}

function levelLabel(level: Level) {
  if (level === "small") return "Maximum Compression (~50% smaller target)";
  if (level === "balanced") return "Medium Compression (~35% smaller target)";
  return "Minimum Compression (~15% smaller target)";
}

export default function CompressToolPanel({
  embedded = false,
  darkOverride,
  showThemeToggle = true,
}: {
  embedded?: boolean;
  darkOverride?: boolean;
  showThemeToggle?: boolean;
}) {
  const base = useMemo(() => process.env.NEXT_PUBLIC_API_BASE || "", []);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [localDark, setLocalDark] = useState(false);
  const dark = darkOverride ?? localDark;
  const isDarkControlled = darkOverride !== undefined;
  const [mode, setMode] = useState<Mode>("pdf");
  const [level, setLevel] = useState<Level>("balanced");

  const [fileLabel, setFileLabel] = useState("No file selected");
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState(0);
  const [isWorking, setIsWorking] = useState(false);

  const [result, setResult] = useState<{ filename: string; blob: Blob; sizeKB: number } | null>(null);
  const [downloadDone, setDownloadDone] = useState(false);

  useEffect(() => {
    if (isDarkControlled) return;
    const saved = localStorage.getItem("compress_dark");
    if (saved === "1") setLocalDark(true);
  }, [isDarkControlled]);
  useEffect(() => {
    if (isDarkControlled) return;
    localStorage.setItem("compress_dark", localDark ? "1" : "0");
  }, [isDarkControlled, localDark]);

  // progress simulation
  useEffect(() => {
    if (!isWorking) return;
    setProgress(0);
    const start = Date.now();
    const t = window.setInterval(() => {
      const s = (Date.now() - start) / 1000;
      const p = 90 * (1 - Math.exp(-s / 1.2));
      setProgress((prev) => clamp(Math.max(prev, p), 0, 90));
    }, 100);
    return () => window.clearInterval(t);
  }, [isWorking]);

  const pageBg = dark
    ? "bg-gradient-to-b from-neutral-950 to-neutral-900"
    : "bg-gradient-to-b from-amber-50 via-yellow-50 to-amber-100";

  const cardBg = dark ? "bg-neutral-900 border-neutral-800" : "bg-white border-amber-200";
  const panelBg = dark ? "bg-neutral-950/40 border-neutral-800" : "bg-amber-50/60 border-amber-200";

  const progressBarColor =
    progress >= 100 ? (dark ? "bg-emerald-400" : "bg-emerald-500") : (dark ? "bg-amber-400" : "bg-amber-300");

  const rootClass = embedded ? "bg-transparent" : pageBg;
  const contentClass = embedded ? "p-4 md:p-5" : "max-w-4xl mx-auto p-6";

  function acceptForMode(m: Mode) {
    if (m === "pdf") return ".pdf";
    return ".docx";
  }

  function endpointForMode(m: Mode) {
    if (m === "pdf") return "/compress/pdf";
    return "/compress/word";
  }

  function modeLabel(m: Mode) {
    return m === "pdf" ? "PDF Compressor" : "Word Compressor";
  }

  function LevelButton({ id, label, hint }: { id: Level; label: string; hint: string }) {
    const active = level === id;
    return (
      <button
        type="button"
        onClick={() => setLevel(id)}
        className={[
          "w-full rounded-xl border px-4 py-3 text-left transition-all",
          "hover:shadow-md hover:-translate-y-[1px]",
          active
            ? (dark ? "bg-amber-400 text-black border-amber-300" : "bg-amber-300 text-black border-amber-200")
            : (dark
                ? "bg-neutral-900 text-neutral-100 border-neutral-700 hover:border-neutral-500"
                : "bg-white text-slate-800 border-slate-200 hover:border-slate-300"),
        ].join(" ")}
      >
        <div className="text-sm font-semibold">{label}</div>
        <div className={`mt-1 text-xs ${active ? "opacity-95" : (dark ? "text-neutral-300" : "text-slate-600")}`}>
          {hint}
        </div>
      </button>
    );
  }

  async function onCompress(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setResult(null);
    setStatus("");
    setDownloadDone(false);

    const files = fileRef.current?.files;
    if (!files || files.length === 0) {
      setStatus("Please choose a file.");
      return;
    }

    setIsWorking(true);
    setStatus("Compressing...");

    try {
      const fd = new FormData();
      fd.append("file", files[0]);

      const url = `${base}${endpointForMode(mode)}?level=${encodeURIComponent(level)}`;
      const res = await fetch(url, { method: "POST", body: fd });
      if (!res.ok) throw new Error(await res.text());

      const blob = await res.blob();

      const cd = res.headers.get("Content-Disposition") || "";
      const m = cd.match(/filename="([^"]+)"/i);
      const filename =
        m?.[1] || `${safeBase(files[0].name)}_compressed.${mode === "pdf" ? "pdf" : "docx"}`;

      setProgress(100);
      setStatus("Done ✅");

      setResult({ filename, blob, sizeKB: Math.round((blob.size / 1024) * 100) / 100 });
    } catch (err: unknown) {
      setStatus(`Error: ${errorText(err)}`);
    } finally {
      setIsWorking(false);
    }
  }

  function ModeButton({ id }: { id: Mode }) {
    const active = mode === id;
    return (
      <button
        type="button"
        onClick={() => {
          setMode(id);
          setResult(null);
          setStatus("");
          setDownloadDone(false);
          setFileLabel("No file selected");
          if (fileRef.current) fileRef.current.value = "";
        }}
        className={[
          "px-4 py-3 rounded-2xl border text-sm font-semibold transition-all",
          "hover:shadow-md hover:-translate-y-[1px]",
          active
            ? (dark ? "bg-amber-400 text-black border-amber-300" : "bg-amber-300 text-black border-amber-200")
            : (dark
                ? "bg-neutral-800 text-neutral-100 border-neutral-700 hover:border-neutral-500"
                : "bg-white text-slate-800 border-slate-200 hover:border-slate-300"),
        ].join(" ")}
      >
        {modeLabel(id)}
      </button>
    );
  }

  return (
    <div className={rootClass}>
      <div className={contentClass}>
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3 mb-6">
          <div>
            <h1 className={`text-3xl font-semibold ${dark ? "text-white" : "text-slate-900"}`}>
              Document Compressor
            </h1>
          </div>

          {showThemeToggle && (
            <button
              type="button"
              onClick={() => setLocalDark((v) => !v)}
              className={[
                "px-4 py-2 rounded-full border text-sm font-medium transition-all",
                "hover:shadow-md hover:-translate-y-[1px]",
                dark
                  ? "bg-neutral-800 text-neutral-100 border-neutral-700 hover:border-neutral-500"
                  : "bg-white text-slate-800 border-slate-200 hover:border-slate-300",
              ].join(" ")}
              title="Dark Mode"
            >
              {dark ? "☀ Light" : "🌙 Dark"}
            </button>
          )}
        </div>

        <div className={`rounded-3xl border shadow-xl p-6 ${cardBg}`}>
          {/* Mode */}
          <div className="flex flex-wrap gap-2">
            <ModeButton id="pdf" />
            <ModeButton id="word" />
          </div>

          <form onSubmit={onCompress} className="space-y-6 mt-6">
            {/* File */}
            <div className={`rounded-2xl border p-4 ${panelBg}`}>
              <div className={`font-semibold ${dark ? "text-neutral-100" : "text-slate-900"}`}>Choose File</div>

              <input
                ref={fileRef}
                type="file"
                className="hidden"
                accept={acceptForMode(mode)}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  setFileLabel(f ? f.name : "No file selected");
                }}
              />

              <div className="mt-3 flex flex-col sm:flex-row gap-3 sm:items-center">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className={[
                    "px-5 py-3 rounded-2xl font-semibold transition-all",
                    "hover:shadow-md hover:-translate-y-[1px]",
                    dark ? "bg-amber-400 text-black hover:bg-amber-300" : "bg-amber-300 text-black hover:bg-amber-200",
                  ].join(" ")}
                >
                  Browse
                </button>
                <div className={`${dark ? "text-neutral-200" : "text-slate-700"} text-sm`}>
                  {fileLabel}
                </div>
              </div>
            </div>

            {/* Level */}
            <div className={`rounded-2xl border p-4 ${panelBg}`}>
              <div className={`font-semibold ${dark ? "text-neutral-100" : "text-slate-900"}`}>Compression Level</div>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                <LevelButton
                  id="small"
                  label="Maximum"
                  hint="Target around 50% smaller"
                />
                <LevelButton
                  id="balanced"
                  label="Medium"
                  hint="Target around 35% smaller"
                />
                <LevelButton
                  id="high"
                  label="Minimum"
                  hint="Target around 15% smaller"
                />
              </div>
              <div className={`mt-3 rounded-xl border px-3 py-2 text-xs ${
                dark ? "border-neutral-700 bg-neutral-900 text-neutral-200" : "border-slate-200 bg-white text-slate-700"
              }`}>
                Selected: <span className="font-semibold">{levelLabel(level)}</span>
              </div>
            </div>

            {/* Action */}
            <button
              disabled={isWorking}
              className={[
                "w-full py-3 rounded-2xl font-semibold transition-all",
                "hover:shadow-md hover:-translate-y-[1px]",
                isWorking
                  ? (dark ? "bg-neutral-700 text-neutral-200" : "bg-amber-200 text-slate-700")
                  : (dark ? "bg-amber-400 text-black hover:bg-amber-300" : "bg-amber-300 text-black hover:bg-amber-200"),
              ].join(" ")}
            >
              {isWorking ? "Working..." : `Compress (${mode.toUpperCase()})`}
            </button>

            {/* Progress */}
            {(isWorking || status) && (
              <div className={`${dark ? "bg-neutral-950/40 border-neutral-800" : "bg-white border-amber-200"} rounded-2xl border p-4`}>
                <div className="flex items-center justify-between mb-2">
                  <div className={`text-sm font-medium ${dark ? "text-neutral-200" : "text-slate-700"}`}>Progress</div>
                  <div className={`text-sm ${dark ? "text-neutral-300" : "text-slate-600"}`}>{Math.round(progress)}%</div>
                </div>
                <div className={`h-3 w-full rounded-full overflow-hidden ${dark ? "bg-neutral-800" : "bg-amber-100"}`}>
                  <div className={`h-full rounded-full transition-all ${progressBarColor}`} style={{ width: `${clamp(progress, 0, 100)}%` }} />
                </div>
                <div className={`text-sm mt-2 ${dark ? "text-neutral-200" : "text-slate-700"}`}>{status}</div>
              </div>
            )}

            {/* Result */}
            {result && (
              <div className={`${dark ? "bg-neutral-950/40 border-neutral-800" : "bg-white border-amber-200"} rounded-3xl border p-5`}>
                <div className="flex items-start justify-between gap-3">
                  <div className={`text-lg font-semibold ${dark ? "text-white" : "text-slate-900"}`}>Result</div>
                  <div className={`${dark ? "bg-emerald-900/40 text-emerald-200 border-emerald-800" : "bg-emerald-50 text-emerald-800 border-emerald-200"} text-sm px-3 py-1 rounded-full border`}>
                    Ready ✅
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className={`${dark ? "border-neutral-800 bg-neutral-900/40" : "border-amber-200 bg-amber-50/60"} rounded-2xl border p-3`}>
                    <div className={`text-xs ${dark ? "text-neutral-300" : "text-slate-600"}`}>Size</div>
                    <div className={`text-lg font-semibold ${dark ? "text-white" : "text-slate-900"}`}>{result.sizeKB} KB</div>
                  </div>
                  <div className={`${dark ? "border-neutral-800 bg-neutral-900/40" : "border-amber-200 bg-amber-50/60"} rounded-2xl border p-3`}>
                    <div className={`text-xs ${dark ? "text-neutral-300" : "text-slate-600"}`}>Filename</div>
                    <div className={`text-sm font-mono break-all ${dark ? "text-neutral-100" : "text-slate-900"}`}>{result.filename}</div>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      downloadBlob(result.blob, result.filename);
                      setDownloadDone(true);
                    }}
                    className={[
                      "px-5 py-3 rounded-2xl font-semibold transition-all",
                      "hover:shadow-md hover:-translate-y-[1px]",
                      dark ? "bg-emerald-300 text-black hover:bg-emerald-200" : "bg-emerald-900 text-white hover:bg-emerald-800",
                    ].join(" ")}
                  >
                    Download
                  </button>

                  {downloadDone && (
                    <span className={`${dark ? "text-neutral-200" : "text-slate-700"} self-center text-sm`}>
                      Download started ✅
                    </span>
                  )}
                </div>
              </div>
            )}
          </form>
        </div>

        <div className={`mt-6 text-sm ${dark ? "text-neutral-200" : "text-slate-700"}`}>
          <div className="font-semibold mb-2">Tips</div>
          <ul className="list-disc ml-5 space-y-1">
            <li>Use <b>Maximum Compression</b> when upload size limit is strict.</li>
            <li>Use <b>Medium Compression</b> for most exam portals (recommended).</li>
            <li>Use <b>Minimum Compression</b> if document quality is more important than size.</li>
            <li>If the file is still too large, try removing extra scanned pages before compressing.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
