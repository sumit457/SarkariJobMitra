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
    <>
      <BrandHeader eyebrow="Image resize tools" />
      <ImageToolPanel />
      <BrandFooter />
    </>
  );
}
