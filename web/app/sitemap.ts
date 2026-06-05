import type { MetadataRoute } from "next";

const siteUrl = "https://www.sarkarijobmitra.com";
const toolPages = [
  "/image-tools/resize-image-to-20kb",
  "/convert/pdf-to-word",
  "/convert/word-to-pdf",
  "/convert/pdf-to-jpg",
  "/convert/pdf-to-png",
  "/convert/jpg-to-pdf",
  "/convert/png-to-pdf",
  "/compress/pdf",
  "/compress/word",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    {
      url: siteUrl,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteUrl}/tools`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.95,
    },
    {
      url: `${siteUrl}/image-tools`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/convert`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/compress`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    ...toolPages.map((path) => ({
      url: `${siteUrl}${path}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.85,
    })),
  ];
}
