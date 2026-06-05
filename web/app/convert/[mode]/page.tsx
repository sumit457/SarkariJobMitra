import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BrandFooter, BrandHeader } from "@/components/tools/BrandChrome";
import ConvertToolPanel, { type ConvertMode } from "@/components/tools/ConvertToolPanel";

const CONVERT_TOOLS: Record<
  string,
  {
    mode: ConvertMode;
    title: string;
    description: string;
    h1: string;
    intro: string;
    tips: string[];
  }
> = {
  "pdf-to-word": {
    mode: "pdf_to_word",
    title: "Free PDF to Word Converter Online",
    description: "Convert PDF to Word online for free. Useful for editing application forms, notices, and exam documents.",
    h1: "PDF to Word Converter",
    intro: "Upload a PDF and get a Word document. Digital PDFs usually convert as editable text; scanned PDFs may be converted visually for reliability.",
    tips: ["Use smaller PDFs for faster conversion.", "For scanned PDFs, PDF to JPG or PNG can be more reliable.", "Files are processed for the selected tool and are not kept as permanent storage."],
  },
  "word-to-pdf": {
    mode: "word_to_pdf",
    title: "Free Word to PDF Converter Online",
    description: "Convert DOCX Word files to PDF online for free before uploading to exam or application portals.",
    h1: "Word to PDF Converter",
    intro: "Upload a DOCX file and convert it into a PDF suitable for sharing or uploading.",
    tips: ["Use DOCX files for best compatibility.", "Check the output PDF once before final upload.", "Keep your file under the upload size limit shown on the portal."],
  },
  "pdf-to-jpg": {
    mode: "pdf_to_jpg",
    title: "Free PDF to JPG Converter Online",
    description: "Convert PDF pages to JPG images online. Useful for certificates, admit cards, and form uploads.",
    h1: "PDF to JPG Converter",
    intro: "Upload a PDF and download JPG images for each page. Multi-page PDFs are returned as a ZIP file.",
    tips: ["Use this when a portal asks for images instead of PDF.", "For many pages, you will receive a ZIP download.", "JPG is usually smaller than PNG."],
  },
  "pdf-to-png": {
    mode: "pdf_to_png",
    title: "Free PDF to PNG Converter Online",
    description: "Convert PDF pages to PNG images online for clear document and certificate uploads.",
    h1: "PDF to PNG Converter",
    intro: "Upload a PDF and download PNG images for each page. PNG is useful when clarity is more important than file size.",
    tips: ["Use PNG when text clarity matters.", "Use JPG if you need smaller files.", "Multi-page PDFs are downloaded as a ZIP."],
  },
  "jpg-to-pdf": {
    mode: "jpg_to_pdf",
    title: "Free JPG to PDF Converter Online",
    description: "Convert JPG images to one PDF online for free. Combine photos, certificates, and documents into a PDF.",
    h1: "JPG to PDF Converter",
    intro: "Upload one or more JPG images and combine them into a single PDF file.",
    tips: ["Select multiple JPG files to make one PDF.", "Arrange filenames before upload if order matters.", "Compress images first if the PDF becomes too large."],
  },
  "png-to-pdf": {
    mode: "png_to_pdf",
    title: "Free PNG to PDF Converter Online",
    description: "Convert PNG images to PDF online for free. Combine screenshots, certificates, and documents into one PDF.",
    h1: "PNG to PDF Converter",
    intro: "Upload one or more PNG images and create a single PDF file.",
    tips: ["PNG keeps sharp text and screenshots clear.", "Use JPG to PDF if you need smaller file size.", "Multiple PNG files can be combined into one PDF."],
  },
};

type Props = {
  params: Promise<{ mode: string }>;
};

export function generateStaticParams() {
  return Object.keys(CONVERT_TOOLS).map((mode) => ({ mode }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { mode } = await params;
  const tool = CONVERT_TOOLS[mode];
  if (!tool) return {};

  return {
    title: tool.title,
    description: tool.description,
    alternates: {
      canonical: `/convert/${mode}`,
    },
  };
}

export default async function ConvertModePage({ params }: Props) {
  const { mode } = await params;
  const tool = CONVERT_TOOLS[mode];
  if (!tool) notFound();

  return (
    <>
      <BrandHeader eyebrow="Free online converter" />
      <main>
        <section className="mx-auto max-w-4xl px-4 pt-8 text-slate-900">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-600">Free online converter</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">{tool.h1}</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-700">{tool.intro}</p>
        </section>
        <ConvertToolPanel defaultMode={tool.mode} />
        <section className="mx-auto max-w-4xl px-4 pb-10 text-slate-800">
          <h2 className="text-2xl font-semibold">Tips for better results</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-700">
            {tool.tips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </section>
      </main>
      <BrandFooter />
    </>
  );
}
