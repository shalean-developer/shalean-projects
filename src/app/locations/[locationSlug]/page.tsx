import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, MapPin } from "lucide-react";

import { Breadcrumbs } from "@/components/public/breadcrumbs";
import { FAQSection } from "@/components/public/faq-section";
import { FinalCTA } from "@/components/public/final-cta";
import { HeroSection } from "@/components/public/hero-section";
import { PublicPage } from "@/components/public/public-page";
import { ServiceCard } from "@/components/public/service-card";
import { buttonVariants } from "@/components/ui/button";
import { locationFaqs } from "@/config/public-faqs";
import {
  getPublicLocation,
  publicLocations,
} from "@/config/public-locations";
import { publicServices } from "@/config/public-services";
import { publicMetadata } from "@/lib/public-metadata";

export const dynamicParams = false;

type LocationPageProps = {
  params: Promise<{ locationSlug: string }>;
};

export function generateStaticParams() {
  return publicLocations.map((location) => ({
    locationSlug: location.slug,
  }));
}

export async function generateMetadata({
  params,
}: LocationPageProps): Promise<Metadata> {
  const { locationSlug } = await params;
  const location = getPublicLocation(locationSlug);

  if (!location) {
    notFound();
  }

  return publicMetadata({
    title: `Cleaning Services in ${location.name}`,
    description: `Book Shalean cleaning services in ${location.name}, Cape Town, including standard, deep, Airbnb, office, move-out, carpet, and window cleaning.`,
    path: `/locations/${location.slug}`,
  });
}

export default async function LocationPage({ params }: LocationPageProps) {
  const { locationSlug } = await params;
  const location = getPublicLocation(locationSlug);

  if (!location) {
    notFound();
  }

  const nearbyLocations = location.nearby
    .map(getPublicLocation)
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  return (
    <PublicPage>
      <HeroSection
        eyebrow={`${location.area} cleaning services`}
        title={`Cleaning Services in ${location.name}`}
        description={`Book Shalean for standard, deep, Airbnb, office, move-out, carpet, and window cleaning in ${location.name}. ${location.description}`}
        compact
      />
      <section className="py-10">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-5 sm:px-8 lg:px-10">
          <Breadcrumbs
            items={[
              { href: "/services", label: "Services" },
              { label: location.name },
            ]}
          />
          <div className="grid gap-8 lg:grid-cols-[1fr_340px] lg:items-start">
            <div className="grid gap-8">
              <section className="grid gap-4">
                <h2 className="text-2xl font-semibold tracking-normal">
                  Services available in {location.name}
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {publicServices.slice(0, 4).map((service) => (
                    <ServiceCard key={service.slug} service={service} />
                  ))}
                </div>
              </section>
              <section className="grid gap-4">
                <h2 className="text-2xl font-semibold tracking-normal">
                  Why Shalean
                </h2>
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    "Online booking built around the selected service",
                    "Local Cape Town wording and suburb-specific service pages",
                    "Regular, once-off, detailed, and turnover cleaning options",
                  ].map((item) => (
                    <div key={item} className="flex gap-3 rounded-lg border bg-card p-4">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                      <p className="text-sm leading-6 text-muted-foreground">
                        {item}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
              <section className="grid gap-4">
                <h2 className="text-2xl font-semibold tracking-normal">
                  Local cleaning in {location.name}
                </h2>
                <p className="text-sm leading-6 text-muted-foreground">
                  {location.name} customers can request practical cleaning for
                  homes, apartments, short-stay properties, offices, carpets,
                  and move-related handovers. Shalean captures the cleaning
                  scope, frequency, rooms, access details, and add-ons online so
                  the request is clear before the job is prepared.
                </p>
                <div className="flex flex-wrap gap-2">
                  {nearbyLocations.map((nearby) => (
                    <Link
                      key={nearby.slug}
                      href={`/locations/${nearby.slug}`}
                      className="inline-flex items-center gap-1 rounded-full border bg-card px-3 py-1 text-sm hover:border-primary/50 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                      <MapPin className="size-3.5 text-primary" aria-hidden="true" />
                      {nearby.name}
                    </Link>
                  ))}
                </div>
              </section>
            </div>
            <aside className="grid gap-4 rounded-lg border bg-card p-5">
              <h2 className="text-xl font-semibold tracking-normal">
                Book in {location.name}
              </h2>
              <p className="text-sm leading-6 text-muted-foreground">
                Request a Cape Town cleaning service online and include your
                address, preferred service, and cleaning notes.
              </p>
              <Link
                href="/book"
                className={buttonVariants({ className: "h-11 gap-2 px-4" })}
              >
                Book Now
              </Link>
              <Link
                href="/cleaning-prices-cape-town"
                className={buttonVariants({
                  variant: "outline",
                  className: "h-11 gap-2 px-4",
                })}
              >
                View Pricing
              </Link>
            </aside>
          </div>
        </div>
      </section>
      <FAQSection title={`${location.name} Cleaning FAQs`} faqs={locationFaqs} />
      <FinalCTA title={`Book cleaning services in ${location.name}`} />
    </PublicPage>
  );
}

