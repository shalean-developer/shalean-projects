import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/public/breadcrumbs";
import { FAQSection } from "@/components/public/faq-section";
import { FinalCTA } from "@/components/public/final-cta";
import { HeroSection } from "@/components/public/hero-section";
import { PublicPage } from "@/components/public/public-page";
import { ServiceCard } from "@/components/public/service-card";
import { buttonVariants } from "@/components/ui/button";
import { homepageFaqs } from "@/config/public-faqs";
import { publicServices } from "@/config/public-services";
import { publicMetadata } from "@/lib/public-metadata";

export const metadata: Metadata = publicMetadata({
  title: "Residential Cleaning Cape Town",
  description:
    "Explore Shalean residential cleaning in Cape Town for standard home cleaning, deep cleaning, move-out cleaning, Airbnb cleaning, carpets, and windows.",
  path: "/category/residential-cleaning",
});

export default function ResidentialCleaningCategoryPage() {
  const residentialServices = publicServices.filter((service) =>
    [
      "standard-cleaning-cape-town",
      "deep-cleaning-cape-town",
      "move-out-cleaning-cape-town",
      "airbnb-cleaning-cape-town",
      "carpet-cleaning-cape-town",
      "window-cleaning-cape-town",
    ].includes(service.slug)
  );

  return (
    <PublicPage>
      <HeroSection
        eyebrow="Residential cleaning"
        title="Residential Cleaning Cape Town"
        description="Book Shalean residential cleaning for Cape Town homes, apartments, short-stay rentals, move-outs, carpets, and windows."
        primaryHref="/book"
        secondaryHref="/cleaning-prices-cape-town"
        secondaryLabel="View Pricing"
        compact
      />
      <section className="bg-secondary/35 py-12 sm:py-16 lg:py-20">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-5 sm:px-8 lg:px-10">
          <Breadcrumbs
            items={[
              { href: "/services", label: "Services" },
              { label: "Residential Cleaning" },
            ]}
          />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {residentialServices.map((service) => (
              <ServiceCard key={service.slug} service={service} />
            ))}
          </div>
          <section className="rounded-lg border border-border/80 bg-white p-5 shadow-[0_14px_38px_rgba(10,66,42,0.06)]">
            <h2 className="text-2xl font-semibold tracking-normal">
              Residential cleaning for real Cape Town homes
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
              From compact city apartments to larger family homes, Shalean
              captures the cleaning frequency, room count, service type, and
              special notes needed to prepare a residential cleaning request.
            </p>
            <Link
              href="/book"
              className={buttonVariants({ className: "mt-5 h-10 w-fit px-4" })}
            >
              Book Residential Cleaning
            </Link>
          </section>
        </div>
      </section>
      <FAQSection faqs={homepageFaqs} />
      <FinalCTA title="Book residential cleaning in Cape Town" />
    </PublicPage>
  );
}
