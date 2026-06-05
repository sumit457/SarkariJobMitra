import type { Metadata } from "next";
import { BrandFooter, BrandHeader } from "@/components/tools/BrandChrome";
import CompressToolPanel from "@/components/tools/CompressToolPanel";

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
      <CompressToolPanel />
      <BrandFooter />
    </div>
  );
}
