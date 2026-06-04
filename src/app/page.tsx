import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Quote } from "lucide-react";

import { FAQSection } from "@/components/public/faq-section";
import { FinalCTA } from "@/components/public/final-cta";
import { HeroSection } from "@/components/public/hero-section";
import { HowItWorks } from "@/components/public/how-it-works";
import { LocationGrid } from "@/components/public/location-grid";
import { PublicPage } from "@/components/public/public-page";
import { ServiceCard } from "@/components/public/service-card";
import { TrustSection } from "@/components/public/trust-section";
import { buttonVariants } from "@/components/ui/button";
import { homepageFaqs } from "@/config/public-faqs";
import { publicLocations } from "@/config/public-locations";
import { publicServices } from "@/config/public-services";
import { publicMetadata } from "@/lib/public-metadata";

export const metadata: Metadata = publicMetadata({
  title: "Cleaning Services in Cape Town",
  description:
    "Book trusted Cape Town cleaners for standard, deep, Airbnb, office, move-out, carpet, and window cleaning with Shalean.",
  path: "/",
});

export default function Home() {
  return (
    <PublicPage>
      <HeroSection
        eyebrow="Cleaning Services in Cape Town"
        title="Cleaning Services in Cape Town"
        description="Book premium home, Airbnb, office, move-out, carpet, and window cleaning with Shalean. Easy online booking, service-specific details, and trusted Cape Town cleaning support."
        badges={[
          "Trusted Cape Town cleaners",
          "Easy online booking",
          "Regular, deep, Airbnb, office and move-out cleaning",
        ]}
        image={{
          src: "https://images.unsplash.com/photo-1581578731548-c64695cc6952",
          alt: "Cleaner preparing a bright modern home for professional cleaning service",
        }}
      />

      <TrustSection />

      <section className="py-12 sm:py-16">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-5 sm:px-8 lg:px-10">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div className="max-w-3xl">
              <h2 className="text-3xl font-semibold tracking-normal">
                Popular cleaning services
              </h2>
              <p className="mt-3 text-muted-foreground">
                Choose the cleaning service that matches your Cape Town home,
                rental, office, or move.
              </p>
            </div>
            <Link
              href="/services"
              className={buttonVariants({
                variant: "outline",
                className: "h-10 w-fit gap-2 px-4",
              })}
            >
              View Services
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {publicServices.map((service) => (
              <ServiceCard key={service.slug} service={service} />
            ))}
          </div>
        </div>
      </section>

      <HowItWorks />

      <section className="bg-card py-12 sm:py-16">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-5 sm:px-8 lg:px-10">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-semibold tracking-normal">
              Popular Cape Town suburbs
            </h2>
            <p className="mt-3 text-muted-foreground">
              Shalean serves homes, apartments, offices, and short-stay
              properties across Cape Town.
            </p>
          </div>
          <LocationGrid locations={publicLocations} limit={9} />
        </div>
      </section>

      <section className="py-12 sm:py-16">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-5 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:px-10">
          <div className="grid gap-4">
            <h2 className="text-3xl font-semibold tracking-normal">
              Cape Town cleaning prices
            </h2>
            <p className="text-muted-foreground">
              Public pages use helpful from-pricing and quote guidance. The
              booking flow remains the source of truth for service-specific
              pricing, add-ons, and operational rules.
            </p>
            <Link
              href="/cleaning-prices-cape-town"
              className={buttonVariants({ className: "h-10 w-fit gap-2 px-4" })}
            >
              View Pricing
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {publicServices.slice(0, 4).map((service) => (
              <div key={service.slug} className="rounded-lg border bg-card p-4">
                <h3 className="font-semibold">{service.name}</h3>
                <p className="mt-2 text-sm text-primary">{service.fromPrice}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {service.bestFor}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-muted/40 py-12 sm:py-16">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-5 sm:px-8 lg:px-10">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-semibold tracking-normal">
              Reviews from Cape Town customers
            </h2>
            <p className="mt-3 text-muted-foreground">
              Customers choose Shalean for cleaner homes, smoother turnovers,
              and practical booking detail.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              "The online booking questions made it easy to explain exactly what the apartment needed.",
              "Our Airbnb turnover felt organised and guest-ready without a long back-and-forth.",
              "The deep clean was the reset we needed before moving to regular weekly cleaning.",
            ].map((quote) => (
              <figure key={quote} className="grid gap-4 rounded-lg border bg-card p-5">
                <Quote className="size-6 text-primary" aria-hidden="true" />
                <blockquote className="text-sm leading-6 text-muted-foreground">
                  {quote}
                </blockquote>
                <figcaption className="text-sm font-medium">
                  Shalean customer
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <FAQSection faqs={homepageFaqs} />
      <FinalCTA />
    </PublicPage>
  );
}
