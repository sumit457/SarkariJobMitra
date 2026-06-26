import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BrandFooter, BrandHeader } from "@/components/tools/BrandChrome";
import type { CompressMode } from "@/components/tools/CompressToolPanel";
import { ToolsWorkspace } from "@/components/tools/ToolsWorkspace";

const COMPRESS_TOOLS: Record<
  string,
  {
    mode: CompressMode;
    title: string;
    description: string;
    h1: string;
    intro: string;
    tips: string[];
  }
> = {
  pdf: {
    mode: "pdf",
    title: "Free PDF Compressor Online",
    description: "Compress PDF files online for free. Reduce PDF size for exam forms, job applications, and upload limits.",
    h1: "PDF Compressor",
    intro: "Upload a PDF and reduce its file size using simple compression levels for common portal upload limits.",
    tips: ["Use maximum compression when the upload limit is strict.", "Use medium compression for a balance of size and quality.", "Remove unnecessary scanned pages before compressing."],
  },
  word: {
    mode: "word",
    title: "Free Word Compressor Online",
    description: "Compress Word DOCX files online for free before uploading documents to application portals.",
    h1: "Word Compressor",
    intro: "Upload a DOCX file and reduce its size while keeping it usable for document upload requirements.",
    tips: ["Compress images inside the document for best reduction.", "Save as DOCX before uploading.", "If the result is still large, remove unused images or pages."],
  },
};

type Props = {
  params: Promise<{ mode: string }>;
};

export function generateStaticParams() {
  return Object.keys(COMPRESS_TOOLS).map((mode) => ({ mode }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { mode } = await params;
  const tool = COMPRESS_TOOLS[mode];
  if (!tool) return {};

  return {
    title: tool.title,
    description: tool.description,
    alternates: {
      canonical: `/compress/${mode}`,
    },
  };
}

export default async function CompressModePage({ params }: Props) {
  const { mode } = await params;
  const tool = COMPRESS_TOOLS[mode];
  if (!tool) notFound();

  const url = `https://www.sarkarijobmitra.com/compress/${mode}`;
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: tool.h1,
    description: tool.description,
    url,
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Any",
    provider: {
      "@type": "Organization",
      name: "SarkariJobMitra",
      url: "https://www.sarkarijobmitra.com",
    },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "INR",
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-amber-50">
      <BrandHeader />
      <main>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <section className="mx-auto mt-8 max-w-4xl rounded-3xl border border-sky-100 bg-white/75 px-5 py-6 text-slate-900 shadow-sm">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{tool.h1}</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-700">{tool.intro}</p>
        </section>
        <Suspense fallback={<div className="mx-auto max-w-[1800px] px-4 py-8 text-slate-700">Loading tools...</div>}>
          <ToolsWorkspace forcedTool="compress" showChrome={false} defaultCompressMode={tool.mode} />
        </Suspense>
        <section className="mx-auto max-w-4xl rounded-3xl border border-sky-100 bg-white/70 px-5 py-6 text-slate-800 shadow-sm">
          <h2 className="text-2xl font-semibold">Tips for smaller files</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-700">
            {tool.tips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </section>
      </main>
      <BrandFooter />
    </div>
  );
}
