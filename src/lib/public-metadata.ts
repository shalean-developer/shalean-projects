import type { Metadata } from "next";

import { absoluteUrl, PUBLIC_SITE_URL } from "@/config/public-site";

export function publicMetadata({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  return {
    title,
    description,
    alternates: {
      canonical: absoluteUrl(path),
    },
    openGraph: {
      title,
      description,
      url: absoluteUrl(path),
      siteName: "Shalean Cleaning Services",
      locale: "en_ZA",
      type: "website",
    },
  };
}

export const rootPublicMetadata: Metadata = {
  metadataBase: new URL(PUBLIC_SITE_URL),
  title: {
    default: "Shalean Cleaning Services | Cape Town Cleaning Company",
    template: "%s | Shalean Cleaning Services",
  },
  description:
    "Book standard, deep, Airbnb, office, move-out, carpet, and window cleaning services in Cape Town with Shalean.",
  applicationName: "Shalean Cleaning Services",
  creator: "Shalean Cleaning Services",
  publisher: "Shalean Cleaning Services",
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  alternates: {
    canonical: "/",
  },
};
