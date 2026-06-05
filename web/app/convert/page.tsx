import type { Metadata } from "next";
import ConvertToolPanel from "@/components/tools/ConvertToolPanel";

export const metadata: Metadata = {
  title: "Free PDF and Word Converter",
  description:
    "Convert PDF to Word, PDF to JPG/PNG, Word to PDF, images to PDF, and images to Word online.",
  alternates: {
    canonical: "/convert",
  },
};

export default function ConvertPage() {
  return <ConvertToolPanel />;
}
