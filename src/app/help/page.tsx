import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircle, Phone } from "lucide-react";

import { Breadcrumbs } from "@/components/public/breadcrumbs";
import { FAQSection } from "@/components/public/faq-section";
import { FinalCTA } from "@/components/public/final-cta";
import { HeroSection } from "@/components/public/hero-section";
import { PublicPage } from "@/components/public/public-page";
import { buttonVariants } from "@/components/ui/button";
import { homepageFaqs } from "@/config/public-faqs";
import { publicMetadata } from "@/lib/public-metadata";

export const metadata: Metadata = publicMetadata({
  title: "Cleaning Help and Support Cape Town",
  description:
    "Get help with Shalean cleaning bookings, service scopes, pricing guidance, and Cape Town cleaning requests.",
  path: "/help",
});

export default function HelpPage() {
  return (
    <PublicPage>
      <HeroSection
        eyebrow="Help"
        title="Help with your Cape Town cleaning booking"
        description="Find support for service selection, booking details, add-ons, pricing guidance, and Shalean cleaning requests."
        compact
      />
      <section className="py-10">
        <div className="mx-auto grid w-full max-w-5xl gap-8 px-5 sm:px-8 lg:px-10">
          <Breadcrumbs items={[{ label: "Help" }]} />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-4 rounded-lg border bg-card p-5">
              <Phone className="size-7 text-primary" aria-hidden="true" />
              <h2 className="text-2xl font-semibold tracking-normal">Call</h2>
              <p className="text-sm leading-6 text-muted-foreground">
                Speak to Shalean about cleaning services, booking details, or
                customer support.
              </p>
              <a
                href="tel:0871535250"
                className={buttonVariants({ className: "h-10 w-fit px-4" })}
              >
                087 153 5250
              </a>
            </div>
            <div className="grid gap-4 rounded-lg border bg-card p-5">
              <MessageCircle className="size-7 text-primary" aria-hidden="true" />
              <h2 className="text-2xl font-semibold tracking-normal">
                WhatsApp
              </h2>
              <p className="text-sm leading-6 text-muted-foreground">
                Send a WhatsApp message for cleaning questions and booking
                assistance.
              </p>
              <a
                href="https://wa.me/27825915525"
                className={buttonVariants({ className: "h-10 w-fit px-4" })}
              >
                082 591 5525
              </a>
            </div>
          </div>
          <div className="rounded-lg border bg-card p-5">
            <h2 className="text-2xl font-semibold tracking-normal">
              Common booking paths
            </h2>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/book" className={buttonVariants({ className: "h-10 px-4" })}>
                Book Now
              </Link>
              <Link
                href="/services"
                className={buttonVariants({
                  variant: "outline",
                  className: "h-10 px-4",
                })}
              >
                View Services
              </Link>
              <Link
                href="/cleaning-prices-cape-town"
                className={buttonVariants({
                  variant: "outline",
                  className: "h-10 px-4",
                })}
              >
                View Pricing
              </Link>
            </div>
          </div>
        </div>
      </section>
      <FAQSection faqs={homepageFaqs} />
      <FinalCTA />
    </PublicPage>
  );
}

