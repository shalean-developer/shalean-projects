import Link from "next/link";
import { CalendarCheck, MessageCircle } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";

export function FinalCTA({
  title = "Ready to book a Cape Town cleaning service?",
  description = "Tell Shalean what you need and submit your cleaning request online.",
  primaryHref = "/book",
}: {
  title?: string;
  description?: string;
  primaryHref?: string;
}) {
  return (
    <section className="bg-[oklch(0.18_0.018_170)] py-12 text-primary-foreground sm:py-16">
      <div className="mx-auto grid w-full max-w-5xl gap-6 px-5 text-center sm:px-8 lg:px-10">
        <h2 className="text-3xl font-semibold tracking-normal sm:text-4xl">
          {title}
        </h2>
        <p className="mx-auto max-w-2xl text-primary-foreground/75">
          {description}
        </p>
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href={primaryHref}
            className={buttonVariants({
              size: "lg",
              className: "h-12 gap-2 bg-primary-foreground px-5 text-foreground hover:bg-primary-foreground/90",
            })}
          >
            <CalendarCheck className="size-5" aria-hidden="true" />
            Book Now
          </Link>
          <Link
            href="https://wa.me/27825915525"
            className={buttonVariants({
              size: "lg",
              variant: "outline",
              className: "h-12 gap-2 border-primary-foreground/30 bg-transparent px-5 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground",
            })}
          >
            <MessageCircle className="size-5" aria-hidden="true" />
            WhatsApp
          </Link>
        </div>
      </div>
    </section>
  );
}

