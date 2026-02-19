"use client";

import { useState } from "react";

export default function CompressToolCard() {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<"small" | "balanced" | "high">("balanced");

  return (
    <div>
      <div className="text-base font-semibold text-slate-900">PDF Compress</div>
      <div className="mt-1 text-sm text-slate-700">
        Compress PDF/DOCX (small/balanced/high). (MVP UI; processing next).
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium text-slate-800">Upload file</label>
        <input
          className="mt-2 block w-full rounded-xl border bg-white px-3 py-2 text-sm"
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium text-slate-800">Compression</label>
        <select
          className="mt-2 w-full rounded-xl border bg-white px-3 py-2 text-sm"
          value={mode}
          onChange={(e) => setMode(e.target.value as "small" | "balanced" | "high")}
        >
          <option value="small">Small (max compression)</option>
          <option value="balanced">Balanced</option>
          <option value="high">High quality</option>
        </select>
      </div>

      <button
        disabled
        className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white opacity-60"
      >
        Compress (next)
      </button>

      <div className="mt-3 text-xs text-slate-600">
        File: <span className="font-medium">{file ? file.name : "None"}</span> • Mode:{" "}
        <span className="font-medium">{mode}</span>
      </div>
    </div>
  );
}
