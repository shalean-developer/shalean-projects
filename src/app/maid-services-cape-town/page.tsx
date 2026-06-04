import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { Breadcrumbs } from "@/components/public/breadcrumbs";
import { FinalCTA } from "@/components/public/final-cta";
import { HeroSection } from "@/components/public/hero-section";
import { PublicPage } from "@/components/public/public-page";
import { ServiceCard } from "@/components/public/service-card";
import { buttonVariants } from "@/components/ui/button";
import { publicServices } from "@/config/public-services";
import { publicMetadata } from "@/lib/public-metadata";

export const metadata: Metadata = publicMetadata({
  title: "Maid Services Cape Town",
  description:
    "Book Shalean maid services in Cape Town for standard home cleaning, deep cleaning, Airbnb turnovers, move-out cleaning, and office cleaning.",
  path: "/maid-services-cape-town",
});

export default function MaidServicesPage() {
  const homeServices = publicServices.filter((service) =>
    [
      "standard-cleaning-cape-town",
      "deep-cleaning-cape-town",
      "move-out-cleaning-cape-town",
      "airbnb-cleaning-cape-town",
    ].includes(service.slug)
  );

  return (
    <PublicPage>
      <HeroSection
        eyebrow="Maid Services Cape Town"
        title="Maid Services Cape Town"
        description="Book practical, polished maid services for Cape Town homes, apartments, short-stay properties, and move-related cleaning needs."
        primaryHref="/book"
        secondaryHref="/services"
        compact
      />
      <section className="py-10">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-5 sm:px-8 lg:px-10">
          <Breadcrumbs items={[{ label: "Maid Services Cape Town" }]} />
          <div className="grid gap-4 md:grid-cols-2">
            {homeServices.map((service) => (
              <ServiceCard key={service.slug} service={service} />
            ))}
          </div>
          <section className="grid gap-4 rounded-lg border bg-card p-5">
            <h2 className="text-2xl font-semibold tracking-normal">
              What Shalean maid services can cover
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                "Routine kitchen, bathroom, bedroom, and living area cleaning",
                "Once-off home refreshes before guests, events, or inspections",
                "Detailed resets for neglected or high-use rooms",
                "Airbnb and short-stay presentation cleaning",
              ].map((item) => (
                <div key={item} className="flex gap-3">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                  <p className="text-sm leading-6 text-muted-foreground">
                    {item}
                  </p>
                </div>
              ))}
            </div>
            <Link
              href="/book"
              className={buttonVariants({ className: "h-10 w-fit px-4" })}
            >
              Book a Maid Service
            </Link>
          </section>
        </div>
      </section>
      <FinalCTA title="Book maid services in Cape Town" />
    </PublicPage>
  );
}

