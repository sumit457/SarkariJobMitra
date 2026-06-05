import type { Metadata } from "next";
import { BrandFooter, BrandHeader } from "@/components/tools/BrandChrome";
import ImageToolPanel from "@/components/tools/ImageToolPanel";

export const metadata: Metadata = {
  title: "Resize Image to 20KB Online Free",
  description:
    "Resize JPG, JPEG, or PNG images to 20KB online for exam forms, admit card applications, and government portals.",
  alternates: {
    canonical: "/image-tools/resize-image-to-20kb",
  },
};

export default function ResizeImageTo20KbPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-amber-50">
      <BrandHeader />
      <main>
        <section className="mx-auto mt-8 max-w-4xl rounded-3xl border border-sky-100 bg-white/75 px-5 py-6 text-slate-900 shadow-sm">
          <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">Resize Image to 20KB</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-700">
            Upload a JPG, JPEG, or PNG image and resize it to exactly 20KB for online forms and exam portals.
          </p>
        </section>
        <ImageToolPanel />
        <section className="mx-auto max-w-4xl px-4 pb-10 text-slate-800">
          <h2 className="text-2xl font-semibold">Common use cases</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-700">
            <li>Photo upload limits such as 20KB, 30KB, or 50KB.</li>
            <li>Signature and document image upload size limits.</li>
            <li>Government exam, scholarship, and application forms.</li>
          </ul>
        </section>
      </main>
      <BrandFooter />
    </div>
  );
}
