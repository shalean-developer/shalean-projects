import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarCheck, CheckCircle2 } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type HeroSectionProps = {
  eyebrow?: string;
  title: string;
  description: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  badges?: string[];
  image?: {
    src: string;
    alt: string;
  };
  compact?: boolean;
};

export function HeroSection({
  eyebrow,
  title,
  description,
  primaryHref = "/book",
  primaryLabel = "Book a Cleaning",
  secondaryHref = "/services",
  secondaryLabel = "View Services",
  badges = [],
  image,
  compact = false,
}: HeroSectionProps) {
  return (
    <section
      className={cn(
        "overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(49,128,91,0.18),transparent_32rem),linear-gradient(135deg,oklch(0.985_0.008_145),oklch(0.94_0.027_98))]",
        compact ? "py-12 sm:py-16" : "py-14 sm:py-18 lg:py-20"
      )}
    >
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-5 sm:px-8 lg:grid-cols-[1.04fr_0.96fr] lg:items-center lg:px-10">
        <div className="grid gap-6">
          {eyebrow ? (
            <p className="w-fit rounded-full border bg-card px-3 py-1 text-sm font-medium text-primary">
              {eyebrow}
            </p>
          ) : null}
          <div className="grid gap-4">
            <h1
              className={cn(
                "max-w-4xl font-semibold leading-tight tracking-normal text-foreground",
                compact ? "text-4xl sm:text-5xl" : "text-4xl sm:text-5xl lg:text-6xl"
              )}
            >
              {title}
            </h1>
            <p className="max-w-3xl text-lg leading-8 text-muted-foreground">
              {description}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href={primaryHref}
              className={buttonVariants({
                size: "lg",
                className: "h-12 gap-2 px-5 text-base",
              })}
            >
              <CalendarCheck className="size-5" aria-hidden="true" />
              {primaryLabel}
            </Link>
            <Link
              href={secondaryHref}
              className={buttonVariants({
                size: "lg",
                variant: "outline",
                className: "h-12 gap-2 px-5 text-base",
              })}
            >
              {secondaryLabel}
              <ArrowRight className="size-5" aria-hidden="true" />
            </Link>
          </div>
          {badges.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-3">
              {badges.map((badge) => (
                <div
                  key={badge}
                  className="flex min-h-12 items-center gap-2 rounded-lg border bg-card/80 px-3 text-sm text-muted-foreground shadow-sm"
                >
                  <CheckCircle2
                    className="size-4 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  <span>{badge}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
        {image ? (
          <div className="relative min-h-80 overflow-hidden rounded-lg border bg-card shadow-sm">
            <Image
              src={image.src}
              alt={image.alt}
              fill
              priority={!compact}
              sizes="(min-width: 1024px) 45vw, 100vw"
              className="object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-foreground/75 to-transparent p-5 text-primary-foreground">
              <p className="text-sm font-medium">
                Cape Town cleaning teams for homes, offices, and short-stay
                properties.
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

