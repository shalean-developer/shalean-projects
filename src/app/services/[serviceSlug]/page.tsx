import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, MapPin } from "lucide-react";

import { Breadcrumbs } from "@/components/public/breadcrumbs";
import { FAQSection } from "@/components/public/faq-section";
import { FinalCTA } from "@/components/public/final-cta";
import { HeroSection } from "@/components/public/hero-section";
import { PublicPage } from "@/components/public/public-page";
import { buttonVariants } from "@/components/ui/button";
import { publicLocations } from "@/config/public-locations";
import { getPublicService, publicServices } from "@/config/public-services";
import { publicMetadata } from "@/lib/public-metadata";

export const dynamicParams = false;

type ServicePageProps = {
  params: Promise<{ serviceSlug: string }>;
};

export function generateStaticParams() {
  return publicServices.map((service) => ({
    serviceSlug: service.slug,
  }));
}

export async function generateMetadata({
  params,
}: ServicePageProps): Promise<Metadata> {
  const { serviceSlug } = await params;
  const service = getPublicService(serviceSlug);

  if (!service) {
    notFound();
  }

  return publicMetadata({
    title: service.title,
    description: service.shortDescription,
    path: `/services/${service.slug}`,
  });
}

export default async function ServicePage({ params }: ServicePageProps) {
  const { serviceSlug } = await params;
  const service = getPublicService(serviceSlug);

  if (!service) {
    notFound();
  }

  return (
    <PublicPage>
      <HeroSection
        eyebrow="Cape Town cleaning service"
        title={service.title}
        description={service.description}
        primaryHref={`/book?service=${service.bookingSlug}`}
        primaryLabel="Book Now"
        secondaryHref="/cleaning-prices-cape-town"
        secondaryLabel="View Pricing"
        compact
      />
      <section className="bg-secondary/35 py-12 sm:py-16 lg:py-20">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-5 sm:px-8 lg:px-10">
          <Breadcrumbs
            items={[
              { href: "/services", label: "Services" },
              { label: service.name },
            ]}
          />
          <div className="grid gap-8 lg:grid-cols-[1fr_340px] lg:items-start">
            <div className="grid gap-8">
              <InfoSection title="What's included" items={service.included} />
              <InfoSection title="Who it is for" items={service.audience} />
              <InfoSection title="Benefits" items={service.benefits} />
              <InfoSection title="Popular add-ons" items={service.addons} />
              <section className="grid gap-4">
                <h2 className="text-2xl font-semibold tracking-normal">
                  Areas served
                </h2>
                <p className="text-sm leading-6 text-muted-foreground">
                  Shalean provides {service.name.toLowerCase()} across Cape
                  Town, including popular residential, coastal, City Bowl, and
                  Southern Suburbs locations.
                </p>
                <div className="flex flex-wrap gap-2">
                  {publicLocations.slice(0, 12).map((location) => (
                    <Link
                      key={location.slug}
                      href={`/locations/${location.slug}`}
                    className="inline-flex items-center gap-1 rounded-full border border-primary/15 bg-white px-3 py-1 text-sm font-medium hover:border-primary/50 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                      <MapPin className="size-3.5 text-primary" aria-hidden="true" />
                      {location.name}
                    </Link>
                  ))}
                </div>
              </section>
            </div>
            <aside className="grid gap-4 rounded-lg border border-border/80 bg-white p-5 shadow-[0_14px_38px_rgba(10,66,42,0.06)]">
              <h2 className="text-xl font-semibold tracking-normal">
                Service snapshot
              </h2>
              <div className="grid gap-3 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Pricing</span>
                  <span className="font-medium text-primary">
                    {service.fromPrice}
                  </span>
                </div>
                <div className="grid gap-1">
                  <span className="text-muted-foreground">Best for</span>
                  <span>{service.bestFor}</span>
                </div>
              </div>
              <Link
                href={`/book?service=${service.bookingSlug}`}
                className={buttonVariants({ className: "h-11 gap-2 px-4" })}
              >
                Book Now
              </Link>
              <Link
                href="/services"
                className={buttonVariants({
                  variant: "outline",
                  className: "h-11 gap-2 px-4",
                })}
              >
                Compare Services
              </Link>
            </aside>
          </div>
        </div>
      </section>
      <FAQSection title={`${service.name} FAQs`} faqs={service.faqs} />
      <FinalCTA
        title={`Book ${service.name} in Cape Town`}
        primaryHref={`/book?service=${service.bookingSlug}`}
      />
    </PublicPage>
  );
}

function InfoSection({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="grid gap-4">
      <h2 className="text-2xl font-semibold tracking-normal">{title}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <div key={item} className="flex gap-3 rounded-lg border border-border/80 bg-white p-4 shadow-sm">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
            <p className="text-sm leading-6 text-muted-foreground">{item}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
