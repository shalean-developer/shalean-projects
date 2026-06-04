type Faq = {
  question: string;
  answer: string;
};

export function FAQSection({
  title = "Frequently asked questions",
  faqs,
}: {
  title?: string;
  faqs: Faq[];
}) {
  return (
    <section className="bg-muted/40 py-12 sm:py-16">
      <div className="mx-auto grid w-full max-w-4xl gap-6 px-5 sm:px-8 lg:px-10">
        <h2 className="text-3xl font-semibold tracking-normal">{title}</h2>
        <div className="grid gap-3">
          {faqs.map((faq) => (
            <details
              key={faq.question}
              className="group rounded-lg border bg-card p-4 open:border-primary/40"
            >
              <summary className="cursor-pointer list-none font-medium focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
                <span>{faq.question}</span>
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

