import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Info } from "lucide-react";

import { Breadcrumbs } from "@/components/public/breadcrumbs";
import { FAQSection } from "@/components/public/faq-section";
import { FinalCTA } from "@/components/public/final-cta";
import { HeroSection } from "@/components/public/hero-section";
import { PublicPage } from "@/components/public/public-page";
import { buttonVariants } from "@/components/ui/button";
import { pricingFaqs } from "@/config/public-faqs";
import { publicServices } from "@/config/public-services";
import { publicMetadata } from "@/lib/public-metadata";

export const metadata: Metadata = publicMetadata({
  title: "Cleaning Prices Cape Town",
  description:
    "See Cape Town cleaning price guidance for Shalean standard, deep, move-out, Airbnb, office, carpet, and window cleaning services.",
  path: "/cleaning-prices-cape-town",
});

export default function CleaningPricesPage() {
  return (
    <PublicPage>
      <HeroSection
        eyebrow="Pricing"
        title="Cleaning Prices Cape Town"
        description="Compare helpful starting-price guidance for Shalean cleaning services in Cape Town. Exact booking pricing still depends on service scope, add-ons, property details, and availability."
        primaryHref="/book"
        secondaryHref="/services"
        compact
      />
      <section className="py-10">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-5 sm:px-8 lg:px-10">
          <Breadcrumbs items={[{ label: "Cleaning Prices Cape Town" }]} />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {publicServices.map((service) => (
              <div key={service.slug} className="grid gap-4 rounded-lg border bg-card p-5">
                <div>
                  <h2 className="text-xl font-semibold tracking-normal">
                    {service.name}
                  </h2>
                  <p className="mt-2 text-lg font-semibold text-primary">
                    {service.fromPrice}
                  </p>
                </div>
                <p className="text-sm leading-6 text-muted-foreground">
                  {service.bestFor}
                </p>
                <Link
                  href={`/services/${service.slug}`}
                  className="inline-flex items-center gap-1 rounded-sm text-sm font-medium hover:text-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  View service
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </div>
            ))}
          </div>
          <div className="grid gap-4 rounded-lg border bg-card p-5">
            <div className="flex gap-3">
              <Info className="mt-1 size-5 shrink-0 text-primary" aria-hidden="true" />
              <div>
                <h2 className="text-2xl font-semibold tracking-normal">
                  Pricing note
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Public pricing text is marketing guidance only. Shalean does
                  not hardcode these pages into booking logic. The booking flow,
                  Supabase service records, add-ons, and pricing rules remain
                  the source of truth.
                </p>
              </div>
            </div>
            <Link
              href="/book"
              className={buttonVariants({ className: "h-10 w-fit px-4" })}
            >
              Request an Instant Quote
            </Link>
          </div>
        </div>
      </section>
      <FAQSection title="Cleaning Price FAQs" faqs={pricingFaqs} />
      <FinalCTA />
    </PublicPage>
  );
}

