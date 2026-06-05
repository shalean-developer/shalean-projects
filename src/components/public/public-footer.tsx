import Image from "next/image";
import Link from "next/link";
import {
  CalendarCheck,
  Camera,
  CreditCard,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Share2,
} from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { publicLocations } from "@/config/public-locations";
import { publicServices } from "@/config/public-services";

export function PublicFooter() {
  return (
    <footer className="bg-[oklch(0.18_0.035_155)] text-primary-foreground">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-5 py-12 sm:px-8 lg:px-10 lg:py-16">
        <div className="grid gap-8 rounded-[2rem] bg-primary/55 px-6 py-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] md:grid-cols-[0.85fr_1.15fr] md:items-center lg:px-14">
          <Link
            href="/"
            className="flex w-fit rounded-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary-foreground/35"
            aria-label="Shalean home"
          >
            <Image
              src="/Shalean-Logo.png"
              alt="Shalean"
              width={209}
              height={60}
              className="h-14 w-auto"
            />
          </Link>
          <div className="grid gap-5 md:justify-items-start lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase text-primary-foreground/75">
                Book us
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-normal sm:text-4xl">
                Still have questions?
              </h2>
            </div>
            <Link
              href="/book"
              className={buttonVariants({
                className:
                  "h-11 w-fit gap-2 bg-primary-foreground px-5 !text-foreground hover:bg-primary-foreground/90",
              })}
            >
              Book an Appointment
              <CalendarCheck className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-[1fr_0.78fr_0.9fr_1.05fr_0.8fr]">
          <FooterColumn title="Quick Links">
            <FooterLink href="/" label="Home" />
            <FooterLink href="/about" label="About Us" />
            <FooterLink href="/services" label="Services" />
            <FooterLink href="/cleaning-prices-cape-town" label="Pricing" />
            <FooterLink href="/help" label="Help" />
          </FooterColumn>

          <FooterColumn title="Services">
            {publicServices.slice(0, 6).map((service) => (
              <FooterLink
                key={service.slug}
                href={`/services/${service.slug}`}
                label={service.name}
              />
            ))}
          </FooterColumn>

          <FooterColumn title="Locations">
            {publicLocations.slice(0, 7).map((location) => (
              <FooterLink
                key={location.slug}
                href={`/locations/${location.slug}`}
                label={location.name}
              />
            ))}
          </FooterColumn>

          <FooterColumn title="Get Support">
            <a
              href="https://maps.google.com/?q=Cape+Town+South+Africa"
              className="flex w-fit items-center gap-2 rounded-sm text-primary-foreground/75 hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary-foreground/35"
            >
              <MapPin className="size-4 shrink-0" aria-hidden="true" />
              Cape Town, South Africa
            </a>
            <a
              href="mailto:hello@shalean.co.za"
              className="flex w-fit items-center gap-2 rounded-sm text-primary-foreground/75 hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary-foreground/35"
            >
              <Mail className="size-4 shrink-0" aria-hidden="true" />
              hello@shalean.co.za
            </a>
            <a
              href="tel:0871535250"
              className="flex w-fit items-center gap-2 rounded-sm text-primary-foreground/75 hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary-foreground/35"
            >
              <Phone className="size-4 shrink-0" aria-hidden="true" />
              087 153 5250
            </a>
            <a
              href="https://wa.me/27825915525"
              className="flex w-fit items-center gap-2 rounded-sm text-primary-foreground/75 hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary-foreground/35"
            >
              <MessageCircle className="size-4 shrink-0" aria-hidden="true" />
              082 591 5525
            </a>
          </FooterColumn>

          <FooterColumn title="We accept">
            <div className="flex flex-wrap gap-2">
              {["Visa", "Paystack", "EFT", "Card"].map((item) => (
                <span
                  key={item}
                  className="inline-flex min-h-8 items-center rounded-md bg-white px-3 text-xs font-bold text-foreground"
                >
                  {item}
                </span>
              ))}
            </div>
            <div className="mt-4 grid gap-2">
              <span className="inline-flex w-fit items-center gap-2 rounded-md border border-primary-foreground/15 px-3 py-2 text-xs text-primary-foreground/75">
                <CreditCard className="size-3.5" aria-hidden="true" />
                Secure payments
              </span>
              <span className="inline-flex w-fit rounded-md border border-primary-foreground/15 px-3 py-2 text-xs text-primary-foreground/75">
                Satisfaction support
              </span>
            </div>
          </FooterColumn>
        </div>

        <div className="flex flex-col gap-5 border-t border-primary-foreground/10 pt-6 text-sm text-primary-foreground/60 sm:flex-row sm:items-center sm:justify-between">
          <p>
            Copyright {new Date().getFullYear()} Shalean Cleaning Services.
            Cape Town, South Africa.
          </p>
          <div className="flex gap-2">
            <SocialLink href="https://www.facebook.com/shalean" label="Facebook" icon={Share2} />
            <SocialLink href="https://www.instagram.com/shalean" label="Instagram" icon={Camera} />
            <SocialLink href="https://wa.me/27825915525" label="WhatsApp" icon={MessageCircle} />
          </div>
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
      <h2 className="text-sm font-semibold tracking-normal text-primary-foreground">
        {title}
      </h2>
      <div className="grid gap-2 text-sm">{children}</div>
    </div>
  );
}

function FooterLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="w-fit rounded-sm text-primary-foreground/75 hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary-foreground/35"
    >
      {label}
    </Link>
  );
}

function SocialLink({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <a
      href={href}
      aria-label={`Shalean on ${label}`}
      className="grid size-9 place-items-center rounded-full border border-primary-foreground/25 text-primary-foreground/80 hover:bg-primary-foreground/10 hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary-foreground/35"
    >
      <Icon className="size-4" aria-hidden="true" />
    </a>
  );
}
