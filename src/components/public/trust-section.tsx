import { CalendarCheck, HeartHandshake, ShieldCheck, Sparkles } from "lucide-react";

const trustItems = [
  {
    title: "Trusted Cape Town cleaners",
    description:
      "Local cleaning services for homes, apartments, offices, and short-stay properties.",
    icon: ShieldCheck,
  },
  {
    title: "Easy online booking",
    description:
      "Choose a service, add property details, select add-ons, and submit your request.",
    icon: CalendarCheck,
  },
  {
    title: "Service-specific questions",
    description:
      "The booking flow captures the right details for each cleaning category.",
    icon: Sparkles,
  },
  {
    title: "Support when it matters",
    description:
      "Get help with booking details, service scope, and cleaning requirements.",
    icon: HeartHandshake,
  },
];

export function TrustSection() {
  return (
    <section className="bg-card py-12 sm:py-16">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-5 sm:px-8 lg:px-10">
        <div className="max-w-3xl">
          <h2 className="text-3xl font-semibold tracking-normal">
            A cleaning service built for Cape Town routines
          </h2>
          <p className="mt-3 text-muted-foreground">
            Shalean keeps the public booking experience simple while preserving
            the operational detail needed for accurate cleaning requests.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {trustItems.map((item) => (
            <div key={item.title} className="grid gap-3 rounded-lg border p-4">
              <item.icon className="size-6 text-primary" aria-hidden="true" />
              <h3 className="font-semibold">{item.title}</h3>
              <p className="text-sm leading-6 text-muted-foreground">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

