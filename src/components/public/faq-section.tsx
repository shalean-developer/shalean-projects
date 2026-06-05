import Link from "next/link";
import { ChevronDown } from "lucide-react";

type Faq = {
  question: string;
  answer: string;
};

export function FAQSection({
  title = "Frequently asked questions",
  description = "Answers to common Cape Town cleaning questions before you book.",
  faqs,
  showAllLink = true,
}: {
  title?: string;
  description?: string;
  faqs: Faq[];
  showAllLink?: boolean;
}) {
  return (
    <section className="bg-secondary/55 py-12 sm:py-16 lg:py-20">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-5 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:px-10">
        <div className="max-w-xl">
          <h2 className="text-3xl font-semibold tracking-normal sm:text-4xl">
            {title}
          </h2>
          <p className="mt-3 leading-7 text-muted-foreground">{description}</p>
          {showAllLink ? (
            <Link
              href="/help"
              className="mt-5 inline-flex rounded-sm text-sm font-semibold text-primary hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              View all FAQs
            </Link>
          ) : null}
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {faqs.map((faq) => (
            <details
              key={faq.question}
              className="group rounded-lg border border-border/80 bg-white p-5 shadow-sm open:border-primary/40"
            >
              <summary className="flex cursor-pointer list-none items-start justify-between gap-4 font-semibold focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
                <span>{faq.question}</span>
                <ChevronDown
                  className="mt-0.5 size-4 shrink-0 text-primary transition group-open:rotate-180"
                  aria-hidden="true"
                />
              </summary>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
