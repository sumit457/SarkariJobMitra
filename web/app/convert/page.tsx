import type { Metadata } from "next";
import { Suspense } from "react";
import { BrandFooter, BrandHeader } from "@/components/tools/BrandChrome";
import { ToolsWorkspace } from "@/components/tools/ToolsWorkspace";

export const metadata: Metadata = {
  title: "Free PDF and Word Converter",
  description:
    "Convert PDF to Word, PDF to JPG/PNG, Word to PDF, images to PDF, and images to Word online.",
  alternates: {
    canonical: "/convert",
  },
};

export default function ConvertPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-amber-50">
      <BrandHeader />
      <Suspense fallback={<div className="mx-auto max-w-[1800px] px-4 py-8 text-slate-700">Loading tools...</div>}>
        <ToolsWorkspace forcedTool="convert" showChrome={false} />
      </Suspense>
      <BrandFooter />
    </div>
  );
}
