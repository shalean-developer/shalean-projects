import Link from "next/link";
import {
  BarChart3,
  CalendarDays,
  CreditCard,
  FileText,
  Headphones,
  Home,
  ListChecks,
  Repeat,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  Tags,
  Users,
  Wallet,
  Workflow,
} from "lucide-react";

import { logoutAdmin } from "@/app/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const adminNavItems = [
  { href: "/admin", label: "Dashboard", icon: Home },
  { href: "/admin/bookings", label: "Bookings", icon: CalendarDays },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/cleaners", label: "Cleaners", icon: Sparkles },
  { href: "/admin/admins", label: "Admins", icon: ShieldCheck },
  { href: "/admin/schedule", label: "Schedule", icon: CalendarDays },
  { href: "/admin/recurring", label: "Recurring", icon: Repeat },
  { href: "/admin/automation", label: "Automation", icon: Workflow },
  { href: "/admin/requests", label: "Requests", icon: ListChecks },
  { href: "/admin/payments", label: "Payments", icon: CreditCard },
  { href: "/admin/invoices", label: "Invoices", icon: FileText },
  { href: "/admin/reviews", label: "Reviews", icon: Star },
  { href: "/admin/support", label: "Support", icon: Headphones },
  { href: "/admin/reports", label: "Reports", icon: BarChart3 },
  { href: "/admin/pricing", label: "Pricing", icon: Tags },
  { href: "/admin/earnings", label: "Earnings", icon: Wallet },
  { href: "/admin/payroll", label: "Payroll", icon: Wallet },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminNav() {
  return (
    <nav className="flex gap-2 overflow-x-auto pb-2 print:hidden">
      {adminNavItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "h-8 shrink-0"
          )}
        >
          <item.icon className="size-4" />
          {item.label}
        </Link>
      ))}
      <form action={logoutAdmin} className="shrink-0">
        <Button type="submit" variant="ghost" size="sm" className="h-8">
          Log out
        </Button>
      </form>
    </nav>
  );
}
