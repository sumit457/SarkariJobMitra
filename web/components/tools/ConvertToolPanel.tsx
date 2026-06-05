"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Mode =
  | "pdf_to_word"
  | "word_to_pdf"
  | "pdf_to_jpg"
  | "pdf_to_png"
  | "jpg_to_pdf"
  | "png_to_pdf"
  | "word_to_jpg"
  | "word_to_png"
  | "jpg_to_word"
  | "png_to_word";

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
  if (err instanceof DOMException && err.name === "AbortError") {
    return "This conversion took too long. Try a smaller PDF, or use PDF to JPG/PNG for scanned documents.";
  }
  const message = err instanceof Error ? err.message : String(err);
  if (/networkerror|failed to fetch|load failed/i.test(message)) {
    return "Could not reach the processing server. If this is the first request, wait 30-60 seconds for the free backend to wake up and try again.";
  }
  return message;
}

export default function ConvertToolPanel({
  embedded = false,
  darkOverride,
  showThemeToggle = true,
}: {
  embedded?: boolean;
  darkOverride?: boolean;
  showThemeToggle?: boolean;
}) {
  const base = useMemo(() => (process.env.NEXT_PUBLIC_API_BASE || "").trim().replace(/\/+$/, ""), []);
  const [localDark, setLocalDark] = useState(false);
  const dark = darkOverride ?? localDark;
  const isDarkControlled = darkOverride !== undefined;

  useEffect(() => {
    if (isDarkControlled) return;
    const saved = localStorage.getItem("convert_dark");
    if (saved === "1") setLocalDark(true);
  }, [isDarkControlled]);
  useEffect(() => {
    if (isDarkControlled) return;
    localStorage.setItem("convert_dark", localDark ? "1" : "0");
  }, [isDarkControlled, localDark]);

  // most used first
  const [mode, setMode] = useState<Mode>("pdf_to_word");

  const fileRef = useRef<HTMLInputElement | null>(null);
  const [fileLabel, setFileLabel] = useState("No file selected");

  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState(0);
  const [isWorking, setIsWorking] = useState(false);

  const [result, setResult] = useState<{ filename: string; blob: Blob; sizeKB: number } | null>(null);
  const [downloadDone, setDownloadDone] = useState(false);

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
  const contentClass = embedded ? "p-4 md:p-5" : "max-w-3xl mx-auto p-6";

  function modeLabel(m: Mode) {
    switch (m) {
      case "pdf_to_word":
        return "PDF to Word";
      case "word_to_pdf":
        return "Word to PDF";
      case "pdf_to_jpg":
        return "PDF to JPG";
      case "pdf_to_png":
        return "PDF to PNG";
      case "jpg_to_pdf":
        return "JPG to PDF";
      case "png_to_pdf":
        return "PNG to PDF";
      case "word_to_jpg":
        return "Word to JPG";
      case "word_to_png":
        return "Word to PNG";
      case "jpg_to_word":
        return "JPG to Word";
      case "png_to_word":
        return "PNG to Word";
    }
  }

  function acceptForMode(m: Mode) {
    if (m === "pdf_to_word" || m === "pdf_to_jpg" || m === "pdf_to_png") return ".pdf";
    if (m === "word_to_pdf" || m === "word_to_jpg" || m === "word_to_png") return ".docx";
    if (m === "jpg_to_pdf" || m === "jpg_to_word") return "image/jpeg,image/jpg,image/pjpeg";
    if (m === "png_to_pdf" || m === "png_to_word") return "image/png";
    return "*/*";
  }

  function allowMultiple(m: Mode) {
    // allow multiple images when making a PDF (helps people combine certificate photos)
    return m === "jpg_to_pdf" || m === "png_to_pdf";
  }

  function endpointForMode(m: Mode) {
    switch (m) {
      case "pdf_to_word":
        return "/convert/pdf-to-word";
      case "word_to_pdf":
        return "/convert/word-to-pdf";
      case "pdf_to_jpg":
        return "/convert/pdf-to-jpg";
      case "pdf_to_png":
        return "/convert/pdf-to-png";
      case "jpg_to_pdf":
        return "/convert/jpg-to-pdf";
      case "png_to_pdf":
        return "/convert/png-to-pdf";
      case "word_to_jpg":
        return "/convert/word-to-jpg";
      case "word_to_png":
        return "/convert/word-to-png";
      case "jpg_to_word":
        return "/convert/jpg-to-word";
      case "png_to_word":
        return "/convert/png-to-word";
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

  async function onConvert(e: React.FormEvent<HTMLFormElement>) {
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
    setStatus("Converting...");

    try {
      const fd = new FormData();
      const ep = endpointForMode(mode);

      if (allowMultiple(mode)) {
        Array.from(files).forEach((f) => fd.append("files", f));
      } else {
        fd.append("file", files[0]);
      }

      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 120_000);

      let res: Response;
      try {
        res = await fetch(`${base}${ep}`, { method: "POST", body: fd, signal: controller.signal });
      } finally {
        window.clearTimeout(timeoutId);
      }

      if (!res.ok) throw new Error(await res.text());

      const blob = await res.blob();

      // prefer server filename
      const cd = res.headers.get("Content-Disposition") || "";
      const m = cd.match(/filename="([^"]+)"/i);
      const serverName = m?.[1];

      // fallback name if needed
      const firstName = files[0].name;
      const outFallback =
        serverName ||
        `${safeBase(firstName)}_${modeLabel(mode).replaceAll(" ", "_")}`;

      setProgress(100);
      setStatus("Done ✅");

      setResult({
        filename: serverName || outFallback,
        blob,
        sizeKB: Number((blob.size / 1024).toFixed(2)),
      });
    } catch (err: unknown) {
      setStatus(`Error: ${errorText(err)}`);
      setProgress(0);
    } finally {
      setIsWorking(false);
    }
  }

  function handleDownload() {
    if (!result) return;
    downloadBlob(result.blob, result.filename);
    setDownloadDone(false);
    setTimeout(() => setDownloadDone(true), 800);
  }

  return (
    <div className={rootClass}>
      <div className={contentClass}>
        <div className="flex items-center justify-between mb-6">
          <h1 className={`text-3xl font-semibold ${dark ? "text-white" : "text-slate-900"}`}>
            Document Conversion Tool
          </h1>

          {showThemeToggle && (
            <button
              type="button"
              onClick={() => setLocalDark((v) => !v)}
              className={[
                "px-4 py-2 rounded-full border text-sm font-medium transition-all",
                "hover:shadow-md hover:-translate-y-[1px]",
                dark
                  ? "bg-neutral-800 text-neutral-100 border-neutral-700 hover:border-neutral-500"
                  : "bg-white text-slate-800 border-amber-200 hover:border-amber-300",
              ].join(" ")}
              title="Dark Mode"
            >
              {dark ? "☀ Light" : "🌙 Dark"}
            </button>
          )}
        </div>

        <div className={`rounded-2xl shadow-lg border p-6 ${cardBg}`}>
          {/* Main buttons only (most used first) */}
          <div className="grid gap-3 sm:grid-cols-2">
            <ModeButton id="pdf_to_word" />
            <ModeButton id="word_to_pdf" />
            <ModeButton id="pdf_to_jpg" />
            <ModeButton id="pdf_to_png" />
            <ModeButton id="jpg_to_pdf" />
            <ModeButton id="png_to_pdf" />
            <ModeButton id="word_to_jpg" />
            <ModeButton id="word_to_png" />
            <ModeButton id="jpg_to_word" />
            <ModeButton id="png_to_word" />
          </div>

          <form onSubmit={onConvert} className="space-y-6 mt-6">
            {/* Choose File */}
            <div className={`rounded-xl border p-4 ${panelBg}`}>
              <div className={`font-semibold mb-3 ${dark ? "text-neutral-100" : "text-slate-900"}`}>
                Choose File
              </div>

              <input
                ref={fileRef}
                type="file"
                className="hidden"
                multiple={allowMultiple(mode)}
                accept={acceptForMode(mode)}
                onChange={(e) => {
                  const fs = e.target.files;
                  if (!fs || fs.length === 0) setFileLabel("No file selected");
                  else if (fs.length === 1) setFileLabel(fs[0].name);
                  else setFileLabel(`${fs.length} files selected`);
                }}
              />

              <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className={[
                    "px-5 py-2 rounded-xl font-semibold transition-all",
                    "hover:shadow-md hover:-translate-y-[1px]",
                    dark ? "bg-amber-400 text-black hover:bg-amber-300" : "bg-amber-300 text-black hover:bg-amber-200",
                  ].join(" ")}
                >
                  Browse
                </button>

                <div className={`text-sm ${dark ? "text-neutral-200" : "text-slate-700"}`}>
                  {fileLabel}
                </div>
              </div>
            </div>

            {/* Convert */}
            <button
              disabled={isWorking}
              className={[
                "w-full rounded-xl py-3 font-semibold transition-all",
                "hover:shadow-md hover:-translate-y-[1px]",
                isWorking
                  ? (dark ? "bg-neutral-700 text-neutral-200" : "bg-amber-200 text-slate-700")
                  : (dark ? "bg-amber-400 text-black hover:bg-amber-300" : "bg-amber-300 text-black hover:bg-amber-200"),
              ].join(" ")}
            >
              {isWorking ? "Working..." : `Convert (${modeLabel(mode)})`}
            </button>

            {/* Progress */}
            {(isWorking || progress === 100 || status) && (
              <div className={`${dark ? "bg-neutral-950/40 border-neutral-800" : "bg-white border-amber-200"} rounded-xl border p-4`}>
                <div className="flex items-center justify-between mb-2">
                  <div className={`text-sm font-medium ${dark ? "text-neutral-200" : "text-slate-700"}`}>Progress</div>
                  <div className={`text-sm ${dark ? "text-neutral-300" : "text-slate-600"}`}>{Math.round(progress)}%</div>
                </div>
                <div className={`h-3 w-full rounded-full overflow-hidden ${dark ? "bg-neutral-800" : "bg-amber-100"}`}>
                  <div className={`h-full rounded-full transition-all ${progressBarColor}`} style={{ width: `${clamp(progress, 0, 100)}%` }} />
                </div>
                {status && <div className={`text-sm mt-2 ${dark ? "text-neutral-200" : "text-slate-700"}`}>{status}</div>}
              </div>
            )}

            {/* Result */}
            {result && (
              <div className={`${dark ? "bg-neutral-950/40 border-neutral-800" : "bg-white border-amber-200"} rounded-2xl border p-5`}>
                <div className="flex items-start justify-between gap-3">
                  <div className={`text-lg font-semibold ${dark ? "text-white" : "text-slate-900"}`}>Result</div>
                  <div className={`${dark ? "bg-emerald-900/40 text-emerald-200 border-emerald-800" : "bg-emerald-50 text-emerald-800 border-emerald-200"} text-sm px-3 py-1 rounded-full border`}>
                    Ready ✅
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className={`${dark ? "border-neutral-800 bg-neutral-900/40" : "border-amber-200 bg-amber-50/60"} rounded-xl border p-3`}>
                    <div className={`text-xs ${dark ? "text-neutral-300" : "text-slate-600"}`}>New File Size</div>
                    <div className={`text-lg font-semibold ${dark ? "text-white" : "text-slate-900"}`}>{result.sizeKB} KB</div>
                  </div>
                  <div className={`${dark ? "border-neutral-800 bg-neutral-900/40" : "border-amber-200 bg-amber-50/60"} rounded-xl border p-3`}>
                    <div className={`text-xs ${dark ? "text-neutral-300" : "text-slate-600"}`}>File Name</div>
                    <div className={`text-sm font-mono break-all ${dark ? "text-neutral-100" : "text-slate-900"}`}>{result.filename}</div>
                  </div>
                </div>

                <div className="mt-5">
                  <button
                    type="button"
                    onClick={handleDownload}
                    className={[
                      "rounded-xl px-5 py-3 font-semibold transition-all",
                      "hover:shadow-md hover:-translate-y-[1px]",
                      dark ? "bg-emerald-300 text-black hover:bg-emerald-200" : "bg-emerald-900 text-white hover:bg-emerald-800",
                    ].join(" ")}
                  >
                    Download converted file
                  </button>

                  {downloadDone && (
                    <div className={`mt-2 text-sm font-medium ${dark ? "text-emerald-200" : "text-emerald-800"}`}>
                      Download complete ✅
                    </div>
                  )}
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Tips (simple) */}
        <div className={`mt-6 text-sm ${dark ? "text-neutral-200" : "text-slate-700"}`}>
          <div className="font-semibold mb-2">Tips</div>
          <ul className="list-disc ml-5 space-y-1">
            <li>If you choose “JPG to PDF / PNG to PDF”, you can select multiple images to make one PDF.</li>
            <li>If PDF has many pages, “PDF to JPG/PNG” will download a ZIP file.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
