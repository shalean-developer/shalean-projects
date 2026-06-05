import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  MessageCircle,
  Star,
} from "lucide-react";

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
  imageCaption?: string;
  floatingCard?: string;
  showRating?: boolean;
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
  imageCaption = "Cape Town cleaning teams for homes, offices, and short-stay properties.",
  floatingCard,
  showRating = false,
  compact = false,
}: HeroSectionProps) {
  return (
    <section
      className={cn(
        "overflow-hidden bg-[linear-gradient(135deg,white_0%,oklch(0.96_0.025_145)_100%)]",
        compact ? "py-12 sm:py-16" : "py-14 sm:py-18 lg:py-20"
      )}
    >
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-5 sm:px-8 lg:grid-cols-[1.04fr_0.96fr] lg:items-center lg:px-10">
        <div className="grid gap-6">
          {eyebrow ? (
            <p className="w-fit rounded-full border border-primary/15 bg-white px-3 py-1 text-sm font-semibold text-primary shadow-sm">
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
                className: "h-12 gap-2 bg-primary px-5 text-base shadow-[0_14px_30px_rgba(8,105,62,0.18)] hover:bg-primary/90",
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
                className: "h-12 gap-2 border-primary/20 bg-white px-5 text-base text-primary shadow-sm hover:bg-secondary hover:text-primary",
              })}
            >
              {secondaryLabel.toLowerCase().includes("whatsapp") ? (
                <MessageCircle className="size-5" aria-hidden="true" />
              ) : null}
              {secondaryLabel}
              {secondaryLabel.toLowerCase().includes("whatsapp") ? null : (
                <ArrowRight className="size-5" aria-hidden="true" />
              )}
            </Link>
          </div>
          {badges.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {badges.map((badge) => (
                <div
                  key={badge}
                  className="flex min-h-14 items-center gap-3 rounded-lg border border-border/80 bg-white px-4 text-sm font-medium text-foreground shadow-sm"
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
          {showRating ? <GoogleRating /> : null}
        </div>
        {image ? (
          <div className="relative">
            <div className="relative min-h-[24rem] overflow-hidden rounded-lg border border-white bg-card shadow-[0_24px_70px_rgba(10,66,42,0.15)] sm:min-h-[32rem]">
              <Image
                src={image.src}
                alt={image.alt}
                fill
                priority={!compact}
                sizes="(min-width: 1024px) 45vw, 100vw"
                className="object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-foreground/78 to-transparent p-5 text-primary-foreground">
                <p className="text-sm font-semibold">{imageCaption}</p>
              </div>
            </div>
            {floatingCard ? (
              <div className="absolute -bottom-5 left-5 max-w-xs rounded-lg border border-white bg-white p-4 shadow-[0_18px_45px_rgba(10,66,42,0.18)] sm:left-auto sm:right-5">
                <p className="text-sm font-semibold leading-6 text-foreground">
                  {floatingCard}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function GoogleRating() {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border/80 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="flex text-[oklch(0.76_0.16_86)]">
          {Array.from({ length: 5 }).map((_, index) => (
            <Star key={index} className="size-4 fill-current" aria-hidden="true" />
          ))}
        </div>
        <p className="text-sm font-semibold text-foreground">
          Google rating <span className="text-muted-foreground">4.9/5 from 300+ reviews</span>
        </p>
      </div>
      <div className="flex -space-x-2">
        {["SA", "TM", "NP", "LK"].map((initials) => (
          <span
            key={initials}
            className="grid size-8 place-items-center rounded-full border-2 border-white bg-secondary text-xs font-bold text-primary"
          >
            {initials}
          </span>
        ))}
      </div>
    </div>
  );
}
