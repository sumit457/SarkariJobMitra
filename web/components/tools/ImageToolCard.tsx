"use client";

import { useMemo, useState } from "react";

export default function ImageToolCard() {
  const [file, setFile] = useState<File | null>(null);

  const previewUrl = useMemo(() => {
    if (!file) return null;
    return URL.createObjectURL(file);
  }, [file]);

  return (
    <div>
      <div className="text-base font-semibold text-slate-900">Image Tool</div>
      <div className="mt-1 text-sm text-slate-700">
        Resize photo / signature for exam forms (MVP UI; processing will be wired next).
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium text-slate-800">Upload image</label>
        <input
          className="mt-2 block w-full rounded-xl border bg-white px-3 py-2 text-sm"
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </div>

      {previewUrl ? (
        <div className="mt-4 rounded-2xl border bg-slate-50 p-3">
          <div className="text-xs text-slate-600 mb-2">Preview</div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="preview" className="max-h-40 w-full object-contain" />
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border bg-slate-50 p-4 text-sm text-slate-600">
          Upload an image to preview.
        </div>
      )}

      <button
        disabled
        className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white opacity-60"
        title="We will connect actual resizing next"
      >
        Convert / Resize (next)
      </button>
    </div>
  );
}
