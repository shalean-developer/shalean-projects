export const PUBLIC_SITE_URL = "https://shalean.co.za";

export const publicNavLinks = [
  { href: "/services", label: "Services" },
  { href: "/cleaning-prices-cape-town", label: "Pricing" },
  { href: "/about", label: "About" },
  { href: "/help", label: "Help" },
];

export function absoluteUrl(path: string) {
  return `${PUBLIC_SITE_URL}${path === "/" ? "" : path}`;
}

