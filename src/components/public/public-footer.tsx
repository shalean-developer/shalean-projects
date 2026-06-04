import Link from "next/link";
import { CalendarCheck, MessageCircle, Phone } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { publicLocations } from "@/config/public-locations";
import { publicServices } from "@/config/public-services";

export function PublicFooter() {
  return (
    <footer className="border-t bg-[oklch(0.18_0.018_170)] text-primary-foreground">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-5 py-12 sm:px-8 lg:px-10">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <div className="grid gap-4">
            <Link href="/" className="w-fit text-2xl font-semibold">
              Shalean Cleaning Services
            </Link>
            <p className="max-w-2xl text-sm leading-6 text-primary-foreground/75">
              Premium, practical cleaning services for Cape Town homes,
              apartments, Airbnb properties, offices, carpets, and move-related
              jobs.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/book"
                className={buttonVariants({
                  className: "h-10 gap-2 bg-primary-foreground px-4 text-foreground hover:bg-primary-foreground/90",
                })}
              >
                <CalendarCheck className="size-4" aria-hidden="true" />
                Book a Cleaning
              </Link>
              <Link
                href="https://wa.me/27825915525"
                className={buttonVariants({
                  variant: "outline",
                  className: "h-10 gap-2 border-primary-foreground/30 bg-transparent px-4 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground",
                })}
              >
                <MessageCircle className="size-4" aria-hidden="true" />
                WhatsApp
              </Link>
            </div>
          </div>
          <div className="grid gap-3 text-sm">
            <a
              href="tel:0871535250"
              className="flex w-fit items-center gap-2 rounded-sm text-primary-foreground/85 hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary-foreground/35"
            >
              <Phone className="size-4" aria-hidden="true" />
              087 153 5250
            </a>
            <a
              href="https://wa.me/27825915525"
              className="flex w-fit items-center gap-2 rounded-sm text-primary-foreground/85 hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary-foreground/35"
            >
              <MessageCircle className="size-4" aria-hidden="true" />
              WhatsApp: 082 591 5525
            </a>
          </div>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          <FooterColumn title="Services">
            {publicServices.map((service) => (
              <FooterLink
                key={service.slug}
                href={`/services/${service.slug}`}
                label={service.name}
              />
            ))}
          </FooterColumn>
          <FooterColumn title="Locations">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {publicLocations.map((location) => (
                <FooterLink
                  key={location.slug}
                  href={`/locations/${location.slug}`}
                  label={location.name}
                />
              ))}
            </div>
          </FooterColumn>
          <FooterColumn title="Company">
            <FooterLink href="/cleaning-prices-cape-town" label="Pricing" />
            <FooterLink href="/maid-services-cape-town" label="Maid Services" />
            <FooterLink
              href="/same-day-cleaning/cape-town"
              label="Same-day Cleaning"
            />
            <FooterLink
              href="/category/residential-cleaning"
              label="Residential Cleaning"
            />
            <FooterLink href="/about" label="About" />
            <FooterLink href="/help" label="Help" />
            <FooterLink href="/signup" label="Sign Up" />
          </FooterColumn>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid content-start gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-normal text-primary-foreground">
        {title}
      </h2>
      <div className="grid gap-2 text-sm text-primary-foreground/75">
        {children}
      </div>
    </div>
  );
}

function FooterLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="w-fit rounded-sm hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary-foreground/35"
    >
      {label}
    </Link>
  );
}

