import type { MetadataRoute } from "next";

import { absoluteUrl, PUBLIC_SITE_URL } from "@/config/public-site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/account"],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
    host: PUBLIC_SITE_URL,
  };
}

