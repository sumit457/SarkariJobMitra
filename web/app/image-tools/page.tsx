import type { Metadata } from "next";
import { Suspense } from "react";
import { BrandFooter, BrandHeader } from "@/components/tools/BrandChrome";
import { ToolsWorkspace } from "@/components/tools/ToolsWorkspace";

export const metadata: Metadata = {
  title: "Free Image Resize Tool for Exam Forms",
  description:
    "Resize JPG, JPEG, and PNG images to exact KB or size ranges for online government exam and application forms.",
  alternates: {
    canonical: "/image-tools",
  },
};

export default function ImageToolsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-amber-50">
      <BrandHeader />
      <Suspense fallback={<div className="mx-auto max-w-[1800px] px-4 py-8 text-slate-700">Loading tools...</div>}>
        <ToolsWorkspace forcedTool="image" showChrome={false} />
      </Suspense>
      <BrandFooter />
    </div>
  );
}
