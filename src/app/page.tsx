import Link from "next/link";
import { CalendarCheck, ClipboardList, Sparkles } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center gap-10 px-5 py-10 sm:px-8 lg:px-10">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="grid gap-6">
            <div className="flex w-fit items-center gap-2 rounded-full border bg-card px-3 py-1 text-sm text-muted-foreground">
              <Sparkles className="size-4 text-primary" />
              Cleaning bookings made simple
            </div>
            <div className="grid gap-4">
              <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-normal text-foreground sm:text-5xl">
                Shalean Cleaning Services
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
                Book regular, Airbnb, office, carpet, moving, and deep cleaning
                in a service-specific flow that captures the right details for
                each job.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/book"
                className={buttonVariants({
                  size: "lg",
                  className: "h-12 text-base",
                })}
              >
                Book a cleaning
              </Link>
              <Link
                href="/admin"
                className={buttonVariants({
                  size: "lg",
                  variant: "outline",
                  className: "h-12 text-base",
                })}
              >
                View admin
              </Link>
              <Link
                href="/account"
                className={buttonVariants({
                  size: "lg",
                  variant: "outline",
                  className: "h-12 text-base",
                })}
              >
                My account
              </Link>
            </div>
          </div>

          <div className="grid gap-4 rounded-lg border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">V1.1</p>
                <p className="text-2xl font-semibold">Service booking wizard</p>
              </div>
              <CalendarCheck className="size-9 text-primary" />
            </div>
            <div className="grid gap-3">
              {[
                "Service-specific questions",
                "Unique add-ons by service",
                "Review before submission",
                "Admin booking operations",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <ClipboardList className="size-4 text-primary" />
                  <span className="text-sm">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
