import Link from "next/link";
import { CalendarCheck, Phone } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { publicNavLinks } from "@/config/public-site";
import { cn } from "@/lib/utils";

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center justify-between gap-4 px-5 sm:px-8 lg:px-10">
        <Link
          href="/"
          className="rounded-sm text-xl font-semibold tracking-normal text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          aria-label="Shalean home"
        >
          Shalean
        </Link>
        <nav
          aria-label="Main navigation"
          className="hidden items-center gap-1 md:flex"
        >
          {publicNavLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="tel:0871535250"
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon" }),
              "hidden sm:inline-flex"
            )}
            aria-label="Call Shalean"
          >
            <Phone className="size-4" aria-hidden="true" />
          </Link>
          <Link
            href="/book"
            className={buttonVariants({
              className: "h-10 gap-2 px-4 text-sm",
            })}
          >
            <CalendarCheck className="size-4" aria-hidden="true" />
            Book
          </Link>
        </div>
      </div>
      <nav
        aria-label="Mobile navigation"
        className="flex gap-1 overflow-x-auto border-t px-5 py-2 md:hidden"
      >
        {publicNavLinks.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="shrink-0 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

