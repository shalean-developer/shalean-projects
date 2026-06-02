import Link from "next/link";
import { Bell, BookOpen, FileText, Headphones, Home, MapPin, MessageSquare, Repeat, User } from "lucide-react";

import { logoutCustomer } from "@/app/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { requireCustomer } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const navItems = [
  { href: "/account", label: "Overview", icon: Home },
  { href: "/account/bookings", label: "Bookings", icon: BookOpen },
  { href: "/account/recurring", label: "Recurring", icon: Repeat },
  { href: "/account/invoices", label: "Invoices", icon: FileText },
  { href: "/account/reviews", label: "Reviews", icon: MessageSquare },
  { href: "/account/support", label: "Support", icon: Headphones },
  { href: "/account/notifications", label: "Alerts", icon: Bell },
  { href: "/account/addresses", label: "Addresses", icon: MapPin },
  { href: "/account/profile", label: "Profile", icon: User },
];

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { customer } = await requireCustomer("/account");

  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto grid w-full max-w-6xl gap-5 px-5 py-5 sm:px-8 lg:grid-cols-[220px_1fr] lg:px-10">
        <aside className="grid gap-4 lg:sticky lg:top-5 lg:h-fit">
          <div>
            <p className="text-sm font-medium text-primary">Shalean account</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal">
              {customer.full_name}
            </h1>
          </div>
          <nav className="grid grid-cols-2 gap-2 lg:grid-cols-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "h-10 justify-start"
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            ))}
          </nav>
          <form action={logoutCustomer}>
            <Button type="submit" variant="ghost" className="w-full justify-start">
              Log out
            </Button>
          </form>
        </aside>
        <div className="min-w-0">{children}</div>
      </section>
    </main>
  );
}
