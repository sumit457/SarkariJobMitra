import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const siteUrl = "https://www.sarkarijobmitra.com";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "SarkariJobMitra Tools - Free Image Resize, PDF Convert and Compress",
    template: "%s | SarkariJobMitra Tools",
  },
  description:
    "Free online tools for government exam forms: resize images to exact KB, convert PDF to Word/JPG/PNG, and compress PDF or Word files.",
  applicationName: "SarkariJobMitra Tools",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  keywords: [
    "image resize tool",
    "resize image to 20KB",
    "PDF to Word converter",
    "PDF compressor",
    "Word to PDF converter",
    "government exam photo resize",
    "sarkari form image resize",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "SarkariJobMitra Tools - Free Form File Tools",
    description:
      "Resize images, convert documents, and compress PDF/Word files for online exam and application forms.",
    url: siteUrl,
    siteName: "SarkariJobMitra Tools",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "SarkariJobMitra Tools",
    description: "Free image resize, PDF conversion, and document compression tools.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

const cloudflareAnalyticsToken = process.env.NEXT_PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        {cloudflareAnalyticsToken ? (
          <Script
            id="cloudflare-web-analytics"
            src="https://static.cloudflareinsights.com/beacon.min.js"
            strategy="afterInteractive"
            data-cf-beacon={JSON.stringify({ token: cloudflareAnalyticsToken })}
          />
        ) : null}
      </body>
    </html>
  );
}
