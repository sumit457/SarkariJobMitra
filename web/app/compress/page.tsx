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
    <>
      <BrandHeader eyebrow="Document compressor" />
      <CompressToolPanel />
      <BrandFooter />
    </>
  );
}
