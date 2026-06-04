import type { Metadata } from "next";
import Link from "next/link";
import { Clock, Sparkles } from "lucide-react";

import { Breadcrumbs } from "@/components/public/breadcrumbs";
import { FAQSection } from "@/components/public/faq-section";
import { FinalCTA } from "@/components/public/final-cta";
import { HeroSection } from "@/components/public/hero-section";
import { PublicPage } from "@/components/public/public-page";
import { buttonVariants } from "@/components/ui/button";
import { homepageFaqs } from "@/config/public-faqs";
import { publicMetadata } from "@/lib/public-metadata";

export const metadata: Metadata = publicMetadata({
  title: "Same-day Cleaning Cape Town",
  description:
    "Request same-day cleaning in Cape Town with Shalean for urgent home refreshes, Airbnb turnovers, office cleaning, and move-related jobs.",
  path: "/same-day-cleaning/cape-town",
});

export default function SameDayCapeTownPage() {
  return (
    <PublicPage>
      <HeroSection
        eyebrow="Same-day cleaning"
        title="Same-day Cleaning Cape Town"
        description="Need a cleaning request handled quickly? Shalean accepts same-day Cape Town cleaning requests subject to cleaner availability, timing, and the service scope."
        primaryHref="/book"
        secondaryHref="/services"
        compact
      />
      <section className="py-10">
        <div className="mx-auto grid w-full max-w-5xl gap-8 px-5 sm:px-8 lg:px-10">
          <Breadcrumbs
            items={[
              { href: "/services", label: "Services" },
              { label: "Same-day Cleaning Cape Town" },
            ]}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-4 rounded-lg border bg-card p-5">
              <Clock className="size-7 text-primary" aria-hidden="true" />
              <h2 className="text-2xl font-semibold tracking-normal">
                Best for urgent cleaning requests
              </h2>
              <p className="text-sm leading-6 text-muted-foreground">
                Same-day cleaning can help with unexpected guests, short-stay
                turnovers, inspection preparation, and quick household refreshes
                in Cape Town.
              </p>
            </div>
            <div className="grid gap-4 rounded-lg border bg-card p-5">
              <Sparkles className="size-7 text-primary" aria-hidden="true" />
              <h2 className="text-2xl font-semibold tracking-normal">
                Clear scope helps availability
              </h2>
              <p className="text-sm leading-6 text-muted-foreground">
                Add rooms, bathrooms, property condition, access notes, and
                preferred timing in the booking flow so the request can be
                reviewed clearly.
              </p>
            </div>
          </div>
          <Link
            href="/book"
            className={buttonVariants({ className: "h-10 w-fit px-4" })}
          >
            Request Same-day Cleaning
          </Link>
        </div>
      </section>
      <FAQSection faqs={homepageFaqs} />
      <FinalCTA title="Request same-day cleaning in Cape Town" />
    </PublicPage>
  );
}

