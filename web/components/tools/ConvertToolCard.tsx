"use client";

import { useState } from "react";

export default function ConvertToolCard() {
  const [file, setFile] = useState<File | null>(null);

  return (
    <div>
      <div className="text-base font-semibold text-slate-900">Document Convert</div>
      <div className="mt-1 text-sm text-slate-700">
        Word ↔ PDF, Images → PDF, PDF → Word (MVP UI; backend wiring next).
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium text-slate-800">Upload file</label>
        <input
          className="mt-2 block w-full rounded-xl border bg-white px-3 py-2 text-sm"
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </div>

      <div className="mt-4 grid gap-2">
        <button
          disabled
          className="w-full rounded-xl border bg-white px-4 py-2 text-sm font-semibold text-slate-900 opacity-60"
        >
          Convert to PDF (next)
        </button>
        <button
          disabled
          className="w-full rounded-xl border bg-white px-4 py-2 text-sm font-semibold text-slate-900 opacity-60"
        >
          Convert to Word (next)
        </button>
      </div>

      <div className="mt-3 text-xs text-slate-600">
        Selected: <span className="font-medium">{file ? file.name : "None"}</span>
      </div>
    </div>
  );
}
