import Image from "next/image";
import Link from "next/link";
import {
  CalendarCheck,
  ChevronDown,
  Clock,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
} from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { publicNavLinks } from "@/config/public-site";

const serviceLinks = [
  { href: "/services/standard-cleaning-cape-town", label: "Standard Cleaning" },
  { href: "/services/deep-cleaning-cape-town", label: "Deep Cleaning" },
  { href: "/services/move-out-cleaning-cape-town", label: "Move-out Cleaning" },
  { href: "/services/airbnb-cleaning-cape-town", label: "Airbnb Cleaning" },
  { href: "/services/office-cleaning-cape-town", label: "Office Cleaning" },
  { href: "/services/carpet-cleaning-cape-town", label: "Carpet Cleaning" },
];

const topBarItems = [
  {
    label: "8am - 6pm (Mon - Sat)",
    icon: Clock,
    className: "text-muted-foreground",
  },
  {
    label: "Cape Town, South Africa",
    icon: MapPin,
    className: "hidden text-muted-foreground md:inline-flex",
  },
  {
    label: "hello@shalean.co.za",
    icon: Mail,
    className: "hidden text-muted-foreground lg:inline-flex",
  },
];

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-white shadow-[0_12px_30px_rgba(10,66,42,0.08)]">
      <div className="border-b border-border/70 bg-secondary/30">
        <div className="mx-auto flex min-h-9 w-full max-w-7xl items-center justify-between gap-4 px-5 text-xs font-semibold sm:px-8 lg:px-10">
          <span className="inline-flex min-h-9 shrink-0 items-center gap-2 rounded-r-full bg-primary px-4 text-primary-foreground sm:min-w-72">
            <ShieldCheck className="size-4 shrink-0" aria-hidden="true" />
            <span className="truncate">No hidden cleaning fees</span>
          </span>
          <div className="ml-auto flex min-w-0 items-center justify-end gap-5 overflow-hidden">
            {topBarItems.map((item) => (
              <span
                key={item.label}
                className={`inline-flex min-h-9 shrink-0 items-center gap-2 ${item.className}`}
              >
                <item.icon className="size-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{item.label}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center justify-between gap-4 px-5 sm:px-8 lg:px-10">
        <Link
          href="/"
          className="flex shrink-0 rounded-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          aria-label="Shalean home"
        >
          <Image
            src="/Shalean-Logo.png"
            alt="Shalean"
            width={209}
            height={60}
            priority
            className="h-11 w-auto"
          />
        </Link>
        <nav
          aria-label="Main navigation"
          className="hidden items-center gap-1 lg:flex"
        >
          <div className="group relative">
            <Link
              href="/services"
              className="inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-semibold text-foreground hover:bg-secondary hover:text-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              Services
              <ChevronDown className="size-3.5" aria-hidden="true" />
            </Link>
            <div className="invisible absolute left-1/2 top-full z-50 mt-3 w-72 -translate-x-1/2 rounded-lg border border-border/80 bg-white p-2 opacity-0 shadow-[0_18px_55px_rgba(10,66,42,0.14)] transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
              {serviceLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          {publicNavLinks
            .filter((item) => item.href !== "/services")
            .map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-2 text-sm font-semibold text-foreground hover:bg-secondary hover:text-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {item.label}
              </Link>
            ))}
        </nav>
        <div className="flex items-center gap-2">
          <a
            href="tel:0871535250"
            className="hidden items-center gap-2 rounded-md text-sm font-semibold text-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:inline-flex"
          >
            <span className="grid size-10 place-items-center rounded-full bg-primary text-primary-foreground">
              <Phone className="size-4" aria-hidden="true" />
            </span>
            <span className="hidden xl:inline">087 153 5250</span>
          </a>
          <Link
            href="/book"
            className={buttonVariants({
              className:
                "h-10 gap-2 bg-primary px-4 text-sm text-primary-foreground shadow-[0_10px_22px_rgba(8,105,62,0.16)] hover:bg-primary/90",
            })}
          >
            <CalendarCheck className="size-4" aria-hidden="true" />
            Book Now
          </Link>
        </div>
      </div>
      <nav
        aria-label="Mobile navigation"
        className="flex gap-1 overflow-x-auto border-t border-border/70 px-5 py-2 lg:hidden"
      >
        {publicNavLinks.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="shrink-0 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
