import { ArrowRight, CalendarPlus, ClipboardCheck, Sparkles } from "lucide-react";

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
    <section className="bg-white py-12 sm:py-16 lg:py-20">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-5 sm:px-8 lg:px-10">
        <div className="max-w-3xl">
          <h2 className="text-3xl font-semibold tracking-normal sm:text-4xl">
            How it works
          </h2>
          <p className="mt-3 text-muted-foreground">
            A focused booking flow captures the details your cleaner needs
            before the visit.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {steps.map((step, index) => (
            <div key={step.title} className="relative grid gap-4 rounded-lg border border-border/80 bg-white p-5 shadow-[0_14px_38px_rgba(10,66,42,0.06)]">
              <div className="flex items-center justify-between">
                <div className="grid size-11 place-items-center rounded-lg bg-secondary text-primary">
                  <step.icon className="size-6" aria-hidden="true" />
                </div>
                <span className="text-sm font-semibold text-primary">
                  0{index + 1}
                </span>
              </div>
              <h3 className="text-xl font-semibold">{step.title}</h3>
              <p className="text-sm leading-6 text-muted-foreground">
                {step.description}
              </p>
              {index < steps.length - 1 ? (
                <span className="absolute -right-5 top-1/2 z-10 hidden size-10 -translate-y-1/2 place-items-center rounded-full border border-border/80 bg-white text-primary shadow-sm md:grid">
                  <ArrowRight className="size-4" aria-hidden="true" />
                </span>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
