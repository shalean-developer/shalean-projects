import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Sparkles } from "lucide-react";
import { notFound } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { services, getServiceBySlug } from "@/config/services";
import { formatRand } from "@/lib/pricing";

export function generateStaticParams() {
  return services.map((service) => ({
    slug: service.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const service = getServiceBySlug(slug);

  if (!service) {
    return {
      title: "Cleaning Service | Shalean Cleaning Services",
    };
  }

  return {
    title: `${service.name} | Shalean Cleaning Services`,
    description: service.shortDescription,
  };
}

export default async function ServicePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const service = getServiceBySlug(slug);

  if (!service) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-8 sm:px-8 lg:px-10">
        <div className="grid gap-6 lg:grid-cols-[1fr_340px] lg:items-start">
          <div className="grid gap-5">
            <div className="flex w-fit items-center gap-2 rounded-full border bg-card px-3 py-1 text-sm text-muted-foreground">
              <Sparkles className="size-4 text-primary" />
              Shalean Cleaning Services
            </div>
            <div className="grid gap-4">
              <h1 className="text-4xl font-semibold leading-tight tracking-normal sm:text-5xl">
                {service.name}
              </h1>
              <p className="max-w-3xl text-lg leading-8 text-muted-foreground">
                {service.description}
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/book"
                className={buttonVariants({
                  size: "lg",
                  className: "h-12 text-base",
                })}
              >
                Book this service
              </Link>
              <Link
                href="/"
                className={buttonVariants({
                  size: "lg",
                  variant: "outline",
                  className: "h-12 text-base",
                })}
              >
                Back home
              </Link>
            </div>
          </div>

          <Card className="rounded-lg border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle>Service Snapshot</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Starting from</span>
                <span className="font-semibold">{formatRand(service.basePrice)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Estimated duration</span>
                <span className="font-semibold">
                  {Math.round(service.durationMinutes / 60)} hours
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Add-ons available</span>
                <span className="font-semibold">{service.addons.length}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <InfoCard title="Benefits" items={service.benefits} />
          <InfoCard title="What is included" items={service.included} />
        </div>
      </section>
    </main>
  );
}

function InfoCard({ title, items }: { title: string; items: string[] }) {
  return (
    <Card className="rounded-lg">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {items.map((item) => (
          <div key={item} className="flex gap-3">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
            <span className="text-sm leading-6 text-muted-foreground">{item}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
