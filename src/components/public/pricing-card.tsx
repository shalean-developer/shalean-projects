import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";

type PublicPricingCardProps = {
  title: string;
  price: string;
  bullets: string[];
  href?: string;
  featured?: boolean;
};

export function PublicPricingCard({
  title,
  price,
  bullets,
  href = "/book",
  featured = false,
}: PublicPricingCardProps) {
  return (
    <article className="relative grid gap-4 rounded-lg border border-border/80 bg-white p-5 shadow-[0_14px_38px_rgba(10,66,42,0.06)]">
      {featured ? (
        <span className="absolute right-4 top-4 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
          Most Popular
        </span>
      ) : null}
      <div className={featured ? "pr-24" : undefined}>
        <h3 className="text-lg font-semibold tracking-normal">{title}</h3>
        <p className="mt-2 text-2xl font-semibold text-primary">{price}</p>
      </div>
      <ul className="grid gap-2 text-sm leading-6 text-muted-foreground">
        {bullets.map((bullet) => (
          <li key={bullet} className="flex gap-2">
            <CheckCircle2
              className="mt-1 size-4 shrink-0 text-primary"
              aria-hidden="true"
            />
            <span>{bullet}</span>
          </li>
        ))}
      </ul>
      <Link
        href={href}
        className={buttonVariants({
          className: "h-10 w-full bg-primary px-4 hover:bg-primary/90",
        })}
      >
        Book Now
      </Link>
    </article>
  );
}
