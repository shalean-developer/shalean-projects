import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { Breadcrumbs } from "@/components/public/breadcrumbs";
import { FinalCTA } from "@/components/public/final-cta";
import { HeroSection } from "@/components/public/hero-section";
import { PublicPage } from "@/components/public/public-page";
import { buttonVariants } from "@/components/ui/button";
import { publicMetadata } from "@/lib/public-metadata";

export const metadata: Metadata = publicMetadata({
  title: "About Shalean Cleaning Services",
  description:
    "Learn about Shalean Cleaning Services, a Cape Town cleaning company for homes, offices, Airbnb properties, move-outs, carpets, and windows.",
  path: "/about",
});

export default function AboutPage() {
  return (
    <PublicPage>
      <HeroSection
        eyebrow="About Shalean"
        title="A Cape Town cleaning company built around clear booking detail"
        description="Shalean helps customers request the right cleaning service with a focused online flow for homes, rentals, offices, carpets, and detailed property cleans."
        compact
      />
      <section className="bg-secondary/35 py-12 sm:py-16 lg:py-20">
        <div className="mx-auto grid w-full max-w-5xl gap-8 px-5 sm:px-8 lg:px-10">
          <Breadcrumbs items={[{ label: "About" }]} />
          <div className="grid gap-5 text-sm leading-7 text-muted-foreground">
            <h2 className="text-2xl font-semibold tracking-normal text-foreground">
              Cleaning services shaped for Cape Town
            </h2>
            <p>
              Shalean provides public cleaning services for Cape Town homes,
              apartments, short-stay properties, offices, carpets, windows, and
              move-related property handovers. The platform is designed to make
              booking simple while collecting enough operational detail for each
              service.
            </p>
            <p>
              The public website layer supports search visibility and live URL
              compatibility while the existing booking flow, Supabase queries,
              account pages, admin dashboard, pricing logic, and auth workflows
              continue to do their specialised work.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              "Cape Town local service pages",
              "Service-specific cleaning scopes",
              "Online booking for customers and teams",
            ].map((item) => (
              <div key={item} className="flex gap-3 rounded-lg border border-border/80 bg-white p-4 shadow-sm">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <p className="text-sm leading-6 text-muted-foreground">{item}</p>
              </div>
            ))}
          </div>
          <Link
            href="/services"
            className={buttonVariants({ className: "h-10 w-fit px-4" })}
          >
            Explore Services
          </Link>
        </div>
      </section>
      <FinalCTA />
    </PublicPage>
  );
}
