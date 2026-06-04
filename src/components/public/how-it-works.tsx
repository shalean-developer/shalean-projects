import { CalendarPlus, ClipboardCheck, Sparkles } from "lucide-react";

const steps = [
  {
    title: "Choose your service",
    description:
      "Pick standard, deep, move-out, Airbnb, office, carpet, or window cleaning.",
    icon: ClipboardCheck,
  },
  {
    title: "Share the details",
    description:
      "Add your Cape Town address, rooms, timing, frequency, and service-specific notes.",
    icon: CalendarPlus,
  },
  {
    title: "Get cleaning-ready",
    description:
      "Shalean receives the request with the right scope so the job can be prepared.",
    icon: Sparkles,
  },
];

export function HowItWorks() {
  return (
    <section className="py-12 sm:py-16">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-5 sm:px-8 lg:px-10">
        <div className="max-w-3xl">
          <h2 className="text-3xl font-semibold tracking-normal">
            How it works
          </h2>
          <p className="mt-3 text-muted-foreground">
            Book online in a few focused steps without changing the existing
            Shalean booking flow.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {steps.map((step, index) => (
            <div key={step.title} className="grid gap-4 rounded-lg border bg-card p-5">
              <div className="flex items-center justify-between">
                <step.icon className="size-7 text-primary" aria-hidden="true" />
                <span className="text-sm font-semibold text-muted-foreground">
                  0{index + 1}
                </span>
              </div>
              <h3 className="text-xl font-semibold">{step.title}</h3>
              <p className="text-sm leading-6 text-muted-foreground">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

