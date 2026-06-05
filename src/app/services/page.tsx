import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

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
  title: "Cleaning Services Cape Town",
  description:
    "Explore Shalean cleaning services in Cape Town including standard, deep, move-out, Airbnb, office, carpet, and window cleaning.",
  path: "/services",
});

export default function ServicesPage() {
  return (
    <PublicPage>
      <HeroSection
        eyebrow="Services"
        title="Cleaning services for Cape Town homes, offices, and rentals"
        description="Compare Shalean's public cleaning services and book the option that fits your property, timing, and level of detail."
        compact
      />
      <section className="bg-secondary/45 py-12 sm:py-16 lg:py-20">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-5 sm:px-8 lg:px-10">
          <Breadcrumbs items={[{ label: "Services" }]} />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {publicServices.map((service) => (
              <ServiceCard key={service.slug} service={service} />
            ))}
          </div>
          <div className="rounded-lg border border-border/80 bg-white p-5 shadow-[0_14px_38px_rgba(10,66,42,0.06)]">
            <h2 className="text-2xl font-semibold tracking-normal">
              Need help choosing?
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
              Standard cleaning is best for upkeep, deep cleaning is best for a
              reset, and move-out cleaning is built for handover. Airbnb and
              office cleaning use dedicated service questions for timing and
              property details.
            </p>
            <Link
              href="/book"
              className={buttonVariants({
                className: "mt-5 h-10 w-fit gap-2 px-4",
              })}
            >
              Book a Cleaning
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
      <FAQSection faqs={homepageFaqs} />
      <FinalCTA />
    </PublicPage>
  );
}
