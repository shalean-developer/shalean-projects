import type { MetadataRoute } from "next";

import { publicLocations } from "@/config/public-locations";
import { publicServices } from "@/config/public-services";
import { absoluteUrl } from "@/config/public-site";

const corePaths = [
  "/",
  "/about",
  "/services",
  "/help",
  "/signup",
  "/cleaning-prices-cape-town",
  "/maid-services-cape-town",
  "/same-day-cleaning/cape-town",
  "/category/residential-cleaning",
  "/book",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const servicePaths = publicServices.map(
    (service) => `/services/${service.slug}`
  );
  const locationPaths = publicLocations.map(
    (location) => `/locations/${location.slug}`
  );

  return [...corePaths, ...servicePaths, ...locationPaths].map((path) => ({
    url: absoluteUrl(path),
    lastModified: now,
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : path === "/book" ? 0.9 : 0.7,
  }));
}

