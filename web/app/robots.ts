import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const phase = process.env.NEXT_PUBLIC_SITE_PHASE ?? process.env.SITE_PHASE ?? "tools";

  if (phase === "tools") {
    return {
      rules: {
        userAgent: "*",
        allow: ["/", "/tools", "/image-tools", "/compress", "/convert"],
        disallow: ["/jobs", "/notices", "/api/jobs", "/api/notifications"],
      },
    };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api"],
    },
  };
}
