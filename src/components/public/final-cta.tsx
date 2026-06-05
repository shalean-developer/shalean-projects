import Link from "next/link";
import { CalendarCheck, CheckCircle2, MessageCircle } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";

export function FinalCTA({
  title = "Ready to book a Cape Town cleaning service?",
  description = "Tell Shalean what you need and submit your cleaning request online. We will help match the right service, scope, and timing.",
  primaryHref = "/book",
}: {
  title?: string;
  description?: string;
  primaryHref?: string;
}) {
  return (
    <section className="bg-[oklch(0.18_0.035_155)] py-12 text-primary-foreground sm:py-16 lg:py-20">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-5 sm:px-8 lg:grid-cols-[1fr_0.75fr] lg:items-center lg:px-10">
        <div className="grid gap-6">
          <div>
            <h2 className="max-w-3xl text-3xl font-semibold tracking-normal sm:text-4xl">
              {title}
            </h2>
            <p className="mt-4 max-w-2xl leading-7 text-primary-foreground/75">
              {description}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href={primaryHref}
              className={buttonVariants({
                size: "lg",
                className:
                  "h-12 gap-2 bg-primary-foreground px-5 !text-foreground hover:bg-primary-foreground/90",
              })}
            >
              <CalendarCheck className="size-5" aria-hidden="true" />
              Book Online
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
              WhatsApp Us
            </Link>
          </div>
        </div>
        <div className="grid gap-3 rounded-lg border border-primary-foreground/15 bg-primary-foreground/10 p-5">
          {[
            "Quick & easy booking",
            "Same-day availability",
            "Trusted local cleaners",
          ].map((item) => (
            <div key={item} className="flex items-center gap-3">
              <CheckCircle2 className="size-5 text-primary-foreground" aria-hidden="true" />
              <span className="font-medium text-primary-foreground/85">
                {item}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
