"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type KBMode = "exact" | "range";
type FitMode = "original" | "crop" | "pad" | "stretch";
type Unit = "px" | "cm";

function clamp(x: number, a: number, b: number) {
  return Math.max(a, Math.min(b, x));
}

function pxToCm(px: number, dpi: number) {
  return (px * 2.54) / dpi;
}

function qualityToPercent(q: number) {
  return Math.round((q / 95) * 100);
}

function safeFileBaseName(filename: string) {
  const dot = filename.lastIndexOf(".");
  const base = dot > 0 ? filename.slice(0, dot) : filename;
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

export default function ImageToolPanel({
  embedded = false,
  darkOverride,
  showThemeToggle = true,
}: {
  embedded?: boolean;
  darkOverride?: boolean;
  showThemeToggle?: boolean;
}) {
  const base = useMemo(() => process.env.NEXT_PUBLIC_API_BASE || "", []);

  const [localDark, setLocalDark] = useState<boolean>(false);
  const dark = darkOverride ?? localDark;
  const isDarkControlled = darkOverride !== undefined;

  useEffect(() => {
    if (isDarkControlled) return;
    const saved = localStorage.getItem("tools_dark");
    if (saved === "1") setLocalDark(true);
  }, [isDarkControlled]);

  useEffect(() => {
    if (isDarkControlled) return;
    localStorage.setItem("tools_dark", localDark ? "1" : "0");
  }, [isDarkControlled, localDark]);

  // Tool states
  const [kbMode, setKbMode] = useState<KBMode>("exact");
  const [fit, setFit] = useState<FitMode>("crop");
  const [unit, setUnit] = useState<Unit>("px");
  const [changeHW, setChangeHW] = useState<boolean>(false);

  // File selection UI
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [fileName, setFileName] = useState<string>("No file selected");

  // Progress + result
  const [status, setStatus] = useState<string>("");
  const [progress, setProgress] = useState<number>(0);
  const [isWorking, setIsWorking] = useState<boolean>(false);

  const [result, setResult] = useState<{
    newSizeKB: number;
    qualityPercent?: number;
    outWpx?: number;
    outHpx?: number;
    outWcm?: number;
    outHcm?: number;
    filename?: string;
    blob?: Blob;
  } | null>(null);

  const [downloadDone, setDownloadDone] = useState<boolean>(false);

  const timerRef = useRef<number | null>(null);

  // Smooth progress simulation (0->90 while running, 100 on finish)
  useEffect(() => {
    if (!isWorking) {
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = null;
      return;
    }

    setProgress(0);
    const start = Date.now();

    timerRef.current = window.setInterval(() => {
      const t = (Date.now() - start) / 1000;
      const k = 1.2;
      const p = 90 * (1 - Math.exp(-t / k));
      setProgress((prev) => clamp(Math.max(prev, p), 0, 90));
    }, 100);

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [isWorking]);

  // ---------- Button components ----------
  const MainPill = ({
    active,
    onClick,
    label,
  }: {
    active: boolean;
    onClick: () => void;
    label: string;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={[
        "px-4 py-2 rounded-full border text-sm font-medium transition-all",
        "shadow-sm hover:shadow-md hover:-translate-y-[1px]",
        active
          ? (dark
              ? "bg-amber-400 text-black border-amber-300"
              : "bg-amber-300 text-black border-amber-200")
          : (dark
              ? "bg-neutral-800 text-neutral-100 border-neutral-700 hover:border-neutral-500"
              : "bg-white text-slate-800 border-slate-200 hover:border-slate-300"),
      ].join(" ")}
    >
      {label}
    </button>
  );

  // Inner group choice button (radio-like clarity)
  const ChoiceButton = ({
    active,
    onClick,
    label,
    hint,
  }: {
    active: boolean;
    onClick: () => void;
    label: string;
    hint?: string;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full text-left rounded-xl border px-4 py-3 transition-all",
        "hover:shadow-sm hover:-translate-y-[1px]",
        active
          ? (dark
              ? "bg-emerald-400 text-black border-emerald-300"
              : "bg-emerald-300 text-black border-emerald-200")
          : (dark
              ? "bg-neutral-900 text-neutral-100 border-neutral-700 hover:border-neutral-500"
              : "bg-white text-slate-800 border-slate-200 hover:border-slate-300"),
      ].join(" ")}
    >
      <div className="font-semibold">{label}</div>
      {hint ? <div className={`text-xs mt-1 ${active ? "opacity-90" : "opacity-70"}`}>{hint}</div> : null}
    </button>
  );

  const InnerPill = ({
    active,
    onClick,
    label,
  }: {
    active: boolean;
    onClick: () => void;
    label: string;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={[
        "px-3 py-2 rounded-full border text-sm transition-all",
        "hover:shadow-sm hover:-translate-y-[1px]",
        active
          ? (dark
              ? "bg-emerald-400 text-black border-emerald-300"
              : "bg-emerald-300 text-black border-emerald-200")
          : (dark
              ? "bg-neutral-900 text-neutral-100 border-neutral-700 hover:border-neutral-500"
              : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"),
      ].join(" ")}
    >
      {label}
    </button>
  );

  // ---------- Submit ----------
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("");
    setResult(null);
    setDownloadDone(false);

    const form = e.currentTarget;
    const fileInput = form.elements.namedItem("file") as HTMLInputElement;
    const file = fileInput.files?.[0];
    if (!file) {
      setStatus("Please choose an image.");
      return;
    }

    setIsWorking(true);
    setStatus("Converting...");

    try {
      const fd = new FormData();
      fd.append("file", file);

      fd.append("tool", "kb");
      fd.append("kb_mode", kbMode);

      if (kbMode === "exact") {
        const targetKb = (form.elements.namedItem("target_kb") as HTMLInputElement).value || "20";
        fd.append("target_kb", targetKb);
      } else {
        const minKb = (form.elements.namedItem("min_kb") as HTMLInputElement).value || "5";
        const maxKb = (form.elements.namedItem("max_kb") as HTMLInputElement).value || "30";
        fd.append("min_kb", minKb);
        fd.append("max_kb", maxKb);
      }

      fd.append("keep_original_dimensions", String(!changeHW));
      fd.append("unit", unit);

      let displayDpi = 300;

      if (changeHW) {
        const w = (form.elements.namedItem("width") as HTMLInputElement).value || "200";
        const h = (form.elements.namedItem("height") as HTMLInputElement).value || "230";
        fd.append("width", w);
        fd.append("height", h);
        fd.append("fit", fit);

        if (unit === "cm") {
          const dpi = (form.elements.namedItem("dpi") as HTMLInputElement).value || "300";
          fd.append("dpi", dpi);
          displayDpi = parseInt(dpi, 10) || 300;
        }
      } else {
        fd.append("fit", "original");
      }

      const res = await fetch(`${base}/tools/image-resize`, {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt);
      }

      const blob = await res.blob();

      const qStr = res.headers.get("X-JPEG-Quality");
      const owStr = res.headers.get("X-Output-Width");
      const ohStr = res.headers.get("X-Output-Height");

      const q = qStr ? parseInt(qStr, 10) : undefined;
      const ow = owStr ? parseInt(owStr, 10) : undefined;
      const oh = ohStr ? parseInt(ohStr, 10) : undefined;

      if (unit !== "cm") displayDpi = 300;

      const outWcm = ow ? pxToCm(ow, displayDpi) : undefined;
      const outHcm = oh ? pxToCm(oh, displayDpi) : undefined;

      const outName = `${safeFileBaseName(file.name)}_resized.jpg`;

      setResult({
        newSizeKB: Number((blob.size / 1024).toFixed(2)),
        qualityPercent: q ? qualityToPercent(q) : undefined,
        outWpx: ow,
        outHpx: oh,
        outWcm: outWcm ? Number(outWcm.toFixed(2)) : undefined,
        outHcm: outHcm ? Number(outHcm.toFixed(2)) : undefined,
        filename: outName,
        blob,
      });

      setProgress(100);
      setStatus("Done ✅");
    } catch (err: unknown) {
      setStatus(`Error: ${errorText(err)}`);
      setProgress(0);
    } finally {
      setIsWorking(false);
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function handleDownload() {
    if (!result?.blob || !result.filename) return;
    downloadBlob(result.blob, result.filename);
    setDownloadDone(false);
    setTimeout(() => setDownloadDone(true), 800);
  }

  // ---------- Styles ----------
  const pageBg = dark
    ? "bg-gradient-to-b from-neutral-950 to-neutral-900"
    : "bg-gradient-to-b from-amber-50 via-yellow-50 to-amber-100";

  const cardBg = dark ? "bg-neutral-900 border-neutral-800" : "bg-white border-amber-200";
  const softPanelBg = dark ? "bg-neutral-950/40 border-neutral-800" : "bg-amber-50/60 border-amber-200";

  // Progress bar color changes after completion
  const progressBarColor =
    progress >= 100
      ? (dark ? "bg-emerald-400" : "bg-emerald-500")
      : (dark ? "bg-amber-400" : "bg-amber-300");

  const rootClass = embedded ? "bg-transparent" : pageBg;
  const contentClass = embedded ? "p-4 md:p-5" : "max-w-3xl mx-auto p-6";

  return (
    <div className={rootClass}>
      <div className={contentClass}>
        {/* Header row */}
        <div className="flex items-center justify-between mb-6">
          <h1 className={`text-3xl font-semibold ${dark ? "text-white" : "text-slate-900"}`}>
            Image Resize Tool
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
              aria-label="Toggle dark mode"
              title="Dark Mode"
            >
              {dark ? "☀ Light" : "🌙 Dark"}
            </button>
          )}
        </div>

        <div className={`rounded-2xl shadow-lg border p-6 ${cardBg}`}>
          <form onSubmit={onSubmit} className="space-y-6">
            {/* Choose Image as a card */}
            <div className={`rounded-xl border p-4 ${softPanelBg}`}>
              <div className={`font-semibold mb-3 ${dark ? "text-neutral-100" : "text-slate-900"}`}>
                Choose Image
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                <input
                  ref={fileRef}
                  name="file"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    setFileName(f ? f.name : "No file selected");
                  }}
                />

                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className={[
                    "px-5 py-2 rounded-xl font-semibold transition-all",
                    "hover:shadow-md hover:-translate-y-[1px]",
                    dark
                      ? "bg-amber-400 text-black hover:bg-amber-300"
                      : "bg-amber-300 text-black hover:bg-amber-200",
                  ].join(" ")}
                >
                  Browse
                </button>

                <div className={`text-sm ${dark ? "text-neutral-200" : "text-slate-700"}`}>
                  {fileName}
                </div>
              </div>
            </div>

            {/* File Size */}
            <div className={`rounded-xl border p-4 ${softPanelBg}`}>
              <div className={`font-semibold mb-3 ${dark ? "text-neutral-100" : "text-slate-900"}`}>
                File Size (KB)
              </div>

              <div className="flex gap-2 flex-wrap">
                <MainPill active={kbMode === "exact"} onClick={() => setKbMode("exact")} label="Exact KB" />
                <MainPill active={kbMode === "range"} onClick={() => setKbMode("range")} label="Range (Min–Max)" />
              </div>

              {kbMode === "exact" ? (
                <div className="mt-3">
                  <label className={`block text-sm mb-1 ${dark ? "text-neutral-200" : "text-slate-700"}`}>
                    Target size (KB)
                  </label>
                  <input
                    name="target_kb"
                    type="number"
                    defaultValue={20}
                    className={[
                      "w-full rounded-lg border px-3 py-2",
                      dark
                        ? "bg-neutral-900 text-white border-neutral-700"
                        : "bg-white text-slate-900 border-amber-200",
                    ].join(" ")}
                  />
                </div>
              ) : (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <label className={`block text-sm mb-1 ${dark ? "text-neutral-200" : "text-slate-700"}`}>
                      Min (KB)
                    </label>
                    <input
                      name="min_kb"
                      type="number"
                      defaultValue={5}
                      className={[
                        "w-full rounded-lg border px-3 py-2",
                        dark
                          ? "bg-neutral-900 text-white border-neutral-700"
                          : "bg-white text-slate-900 border-amber-200",
                      ].join(" ")}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm mb-1 ${dark ? "text-neutral-200" : "text-slate-700"}`}>
                      Max (KB)
                    </label>
                    <input
                      name="max_kb"
                      type="number"
                      defaultValue={30}
                      className={[
                        "w-full rounded-lg border px-3 py-2",
                        dark
                          ? "bg-neutral-900 text-white border-neutral-700"
                          : "bg-white text-slate-900 border-amber-200",
                      ].join(" ")}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Dimensions */}
            <div className={`rounded-xl border p-4 ${softPanelBg}`}>
              <div className={`font-semibold mb-3 ${dark ? "text-neutral-100" : "text-slate-900"}`}>
                Dimensions
              </div>

              <div className="flex gap-2 flex-wrap mb-4">
                <MainPill active={!changeHW} onClick={() => setChangeHW(false)} label="Keep Original" />
                <MainPill active={changeHW} onClick={() => setChangeHW(true)} label="Change Height/Width" />
              </div>

              {changeHW && (
                <>
                  {/* Clear unit selection group */}
                  <div className={`rounded-xl border p-4 mb-4 ${dark ? "border-neutral-800 bg-neutral-950/20" : "border-amber-200 bg-white/60"}`}>
                    <div className={`text-sm font-semibold mb-3 ${dark ? "text-neutral-200" : "text-slate-700"}`}>
                      Choose unit (select one)
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <ChoiceButton
                        active={unit === "px"}
                        onClick={() => setUnit("px")}
                        label="Pixels (px)"
                        hint="Use this when the exam form asks like 200 × 230 pixels."
                      />
                      <ChoiceButton
                        active={unit === "cm"}
                        onClick={() => setUnit("cm")}
                        label="Centimeters (cm)"
                        hint="Use this when the form asks like 3.5 × 4.5 cm."
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={`block text-sm mb-1 ${dark ? "text-neutral-200" : "text-slate-700"}`}>
                        Width ({unit})
                      </label>
                      <input
                        name="width"
                        type="number"
                        step="0.01"
                        defaultValue={unit === "px" ? 200 : 3.5}
                        className={[
                          "w-full rounded-lg border px-3 py-2",
                          dark
                            ? "bg-neutral-900 text-white border-neutral-700"
                            : "bg-white text-slate-900 border-amber-200",
                        ].join(" ")}
                      />
                    </div>
                    <div>
                      <label className={`block text-sm mb-1 ${dark ? "text-neutral-200" : "text-slate-700"}`}>
                        Height ({unit})
                      </label>
                      <input
                        name="height"
                        type="number"
                        step="0.01"
                        defaultValue={unit === "px" ? 230 : 4.5}
                        className={[
                          "w-full rounded-lg border px-3 py-2",
                          dark
                            ? "bg-neutral-900 text-white border-neutral-700"
                            : "bg-white text-slate-900 border-amber-200",
                        ].join(" ")}
                      />
                    </div>
                  </div>

                  {unit === "cm" && (
                    <div className="mt-3">
                      <label className={`block text-sm mb-1 ${dark ? "text-neutral-200" : "text-slate-700"}`}>
                        DPI
                      </label>
                      <input
                        name="dpi"
                        type="number"
                        defaultValue={300}
                        className={[
                          "w-full rounded-lg border px-3 py-2",
                          dark
                            ? "bg-neutral-900 text-white border-neutral-700"
                            : "bg-white text-slate-900 border-amber-200",
                        ].join(" ")}
                      />
                    </div>
                  )}

                  <div className="mt-4">
                    <div className={`text-sm font-medium mb-2 ${dark ? "text-neutral-200" : "text-slate-700"}`}>
                      Fit Method
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <InnerPill active={fit === "original"} onClick={() => setFit("original")} label="Original" />
                      <InnerPill active={fit === "crop"} onClick={() => setFit("crop")} label="Crop (best for passport)" />
                      <InnerPill active={fit === "pad"} onClick={() => setFit("pad")} label="Pad (no crop)" />
                      <InnerPill active={fit === "stretch"} onClick={() => setFit("stretch")} label="Stretch" />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Apply */}
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
              {isWorking ? "Working..." : "Apply Changes"}
            </button>

            {/* Progress + Status */}
            {(isWorking || progress === 100 || status) && (
              <div
                className={[
                  "rounded-xl border p-4",
                  dark ? "bg-neutral-950/40 border-neutral-800" : "bg-white border-amber-200",
                ].join(" ")}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`text-sm font-medium ${dark ? "text-neutral-200" : "text-slate-700"}`}>
                    Progress
                  </div>
                  <div className={`text-sm ${dark ? "text-neutral-300" : "text-slate-600"}`}>
                    {Math.round(progress)}%
                  </div>
                </div>

                <div className={`h-3 w-full rounded-full overflow-hidden ${dark ? "bg-neutral-800" : "bg-amber-100"}`}>
                  <div
                    className={`h-full rounded-full transition-all ${progressBarColor}`}
                    style={{ width: `${clamp(progress, 0, 100)}%` }}
                  />
                </div>

                {status && (
                  <div className={`text-sm mt-2 ${dark ? "text-neutral-200" : "text-slate-700"}`}>
                    {status}
                  </div>
                )}
              </div>
            )}

            {/* Result */}
            {result && (
              <div
                className={[
                  "rounded-2xl border p-5 shadow-sm",
                  dark ? "bg-neutral-950/40 border-neutral-800" : "bg-white border-amber-200",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className={`text-lg font-semibold ${dark ? "text-white" : "text-slate-900"}`}>
                      Result
                    </div>
                  </div>
                  <div className={`text-sm px-3 py-1 rounded-full border ${
                    dark ? "bg-emerald-900/40 text-emerald-200 border-emerald-800"
                         : "bg-emerald-50 text-emerald-800 border-emerald-200"
                  }`}>
                    Ready ✅
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className={`rounded-xl border p-3 ${dark ? "border-neutral-800 bg-neutral-900/40" : "border-amber-200 bg-amber-50/60"}`}>
                    <div className={`text-xs ${dark ? "text-neutral-300" : "text-slate-600"}`}>New Size</div>
                    <div className={`text-lg font-semibold ${dark ? "text-white" : "text-slate-900"}`}>
                      {result.newSizeKB.toFixed(2)} KB
                    </div>
                  </div>

                  <div className={`rounded-xl border p-3 ${dark ? "border-neutral-800 bg-neutral-900/40" : "border-amber-200 bg-amber-50/60"}`}>
                    <div className={`text-xs ${dark ? "text-neutral-300" : "text-slate-600"}`}>Quality</div>
                    <div className={`text-lg font-semibold ${dark ? "text-white" : "text-slate-900"}`}>
                      {result.qualityPercent !== undefined ? `${result.qualityPercent}%` : "—"}
                    </div>
                  </div>

                  <div className={`rounded-xl border p-3 ${dark ? "border-neutral-800 bg-neutral-900/40" : "border-amber-200 bg-amber-50/60"}`}>
                    <div className={`text-xs ${dark ? "text-neutral-300" : "text-slate-600"}`}>Output (H × W)</div>
                    <div className={`text-lg font-semibold ${dark ? "text-white" : "text-slate-900"}`}>
                      {result.outHcm !== undefined && result.outWcm !== undefined
                        ? `${result.outHcm.toFixed(2)} × ${result.outWcm.toFixed(2)} cm`
                        : "—"}
                    </div>
                  </div>
                </div>

                <div className="mt-5">
                  {/* Darker download button */}
                  <button
                    type="button"
                    onClick={handleDownload}
                    className={[
                      "rounded-xl px-5 py-3 font-semibold transition-all",
                      "hover:shadow-md hover:-translate-y-[1px]",
                      dark
                        ? "bg-emerald-300 text-black hover:bg-emerald-200"
                        : "bg-emerald-900 text-white hover:bg-emerald-800",
                    ].join(" ")}
                  >
                    Download resized image
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

        {/* Tips only */}
        <div className={`mt-6 text-sm ${dark ? "text-neutral-200" : "text-slate-700"}`}>
          <div className="font-semibold mb-2">Tips</div>
          <ul className="list-disc ml-5 space-y-1">
            <li><b>Exact KB</b> is best when portal says a fixed size (example: 20KB).</li>
            <li><b>Range</b> is best when portal says (example: 5KB–30KB). Keep max slightly lower (28KB) for safety.</li>
            <li>If portal only checks KB, use <b>Keep Original</b>.</li>
            <li>If portal checks dimensions also, use <b>Change Height/Width</b> and select <b>Crop (best for passport)</b>.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
