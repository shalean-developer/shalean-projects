import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Home,
  Hotel,
  Sparkles,
  SprayCan,
  Truck,
  Wind,
} from "lucide-react";

import type { PublicService } from "@/config/public-services";

const serviceIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  "standard-cleaning-cape-town": Home,
  "deep-cleaning-cape-town": Sparkles,
  "move-out-cleaning-cape-town": Truck,
  "airbnb-cleaning-cape-town": Hotel,
  "office-cleaning-cape-town": Building2,
  "carpet-cleaning-cape-town": SprayCan,
  "window-cleaning-cape-town": Wind,
};

const serviceImages: Record<string, string> = {
  "standard-cleaning-cape-town":
    "https://images.unsplash.com/photo-1581578731548-c64695cc6952",
  "deep-cleaning-cape-town":
    "https://images.unsplash.com/photo-1527515637462-cff94eecc1ac",
  "move-out-cleaning-cape-town":
    "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2",
  "airbnb-cleaning-cape-town":
    "https://images.unsplash.com/photo-1560448204-603b3fc33ddc",
  "office-cleaning-cape-town":
    "https://images.unsplash.com/photo-1497366754035-f200968a6e72",
  "carpet-cleaning-cape-town":
    "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92",
  "window-cleaning-cape-town":
    "https://images.unsplash.com/photo-1524758631624-e2822e304c36",
};

export function ServiceCard({ service }: { service: PublicService }) {
  const Icon = serviceIcons[service.slug] ?? Sparkles;
  const image = serviceImages[service.slug] ?? serviceImages["standard-cleaning-cape-town"];

  return (
    <article className="group overflow-hidden rounded-lg border border-border/80 bg-white shadow-[0_14px_38px_rgba(10,66,42,0.06)] transition hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-[0_20px_48px_rgba(10,66,42,0.11)]">
      <div className="relative h-44 overflow-hidden bg-secondary">
        <Image
          src={image}
          alt={`${service.name} in Cape Town`}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
          className="object-cover transition duration-500 group-hover:scale-105"
        />
        <div className="absolute left-4 top-4 flex size-11 items-center justify-center rounded-lg bg-white text-primary shadow-sm">
          <Icon className="size-5" aria-hidden="true" />
        </div>
      </div>
      <div className="grid gap-4 p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-normal text-primary">
            {service.fromPrice}
          </p>
          <h3 className="mt-2 text-xl font-semibold tracking-normal">
            {service.name}
          </h3>
        </div>
        <p className="text-sm leading-6 text-muted-foreground">
          {service.shortDescription}
        </p>
        <Link
          href={`/services/${service.slug}`}
          className="inline-flex w-fit items-center gap-1 rounded-sm text-sm font-semibold text-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          Learn more
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}
