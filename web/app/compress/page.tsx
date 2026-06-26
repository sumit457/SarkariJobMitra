import type { Metadata } from "next";
import { Suspense } from "react";
import { BrandFooter, BrandHeader } from "@/components/tools/BrandChrome";
import { ToolsWorkspace } from "@/components/tools/ToolsWorkspace";

export const metadata: Metadata = {
  title: "Free PDF and Word Compressor",
  description:
    "Compress PDF and Word documents online with simple size reduction options for upload limits on exam portals.",
  alternates: {
    canonical: "/compress",
  },
};

export default function CompressPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-amber-50">
      <BrandHeader />
      <Suspense fallback={<div className="mx-auto max-w-[1800px] px-4 py-8 text-slate-700">Loading tools...</div>}>
        <ToolsWorkspace forcedTool="compress" showChrome={false} />
      </Suspense>
      <BrandFooter />
    </div>
  );
}
