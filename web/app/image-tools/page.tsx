import type { Metadata } from "next";
import { BrandFooter, BrandHeader } from "@/components/tools/BrandChrome";
import ImageToolPanel from "@/components/tools/ImageToolPanel";

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
      <ImageToolPanel />
      <BrandFooter />
    </div>
  );
}
