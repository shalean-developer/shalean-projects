import Link from "next/link";
import { ArrowRight, CalendarDays, FileText, MapPin, MessageSquare, Plus, Repeat } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { NotificationCenter } from "@/components/platform/notification-center";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireCustomer } from "@/lib/auth";
import {
  getCustomerAddresses,
  getCustomerBookings,
  getNotificationsForUser,
} from "@/lib/supabase/queries";
import type { BookingWithService } from "@/lib/types";

export default async function AccountPage() {
  const { customer } = await requireCustomer("/account");
  const [bookings, addresses] = await Promise.all([
    getCustomerBookings(customer.id),
    getCustomerAddresses(customer.id),
  ]);
  const notifications = await getNotificationsForUser(customer.user_id, "customer");
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = bookings
    .filter((booking) => booking.booking_date >= today && booking.status !== "Cancelled")
    .slice(0, 3);
  const recent = bookings.slice(0, 3);

  return (
    <div className="grid gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-3xl font-semibold tracking-normal">Account</h2>
          <p className="mt-2 text-muted-foreground">
            Your bookings, addresses, and Shalean profile in one place.
          </p>
        </div>
        <Link href="/book" className={buttonVariants({ size: "lg", className: "h-11" })}>
          <Plus className="size-4" />
          New booking
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard title="Upcoming" value={String(upcoming.length)} />
        <SummaryCard title="Recent bookings" value={String(bookings.length)} />
        <SummaryCard title="Saved addresses" value={String(addresses.length)} />
      </div>

      <BookingSection title="Upcoming bookings" bookings={upcoming} empty="No upcoming bookings yet." />
      <BookingSection title="Recent bookings" bookings={recent} empty="Your recent bookings will appear here." />

      <NotificationCenter
        initialNotifications={notifications}
        userId={customer.user_id}
        role="customer"
      />

      <div className="grid gap-4 md:grid-cols-3">
        <QuickLink
          href="/account/recurring"
          icon={Repeat}
          title="Recurring plans"
          description="Create weekly, bi-weekly, or monthly cleaning plans."
        />
        <QuickLink
          href="/account/invoices"
          icon={FileText}
          title="Invoices"
          description="View invoice records for your Shalean bookings."
        />
        <QuickLink
          href="/account/reviews"
          icon={MessageSquare}
          title="Reviews"
          description="Submit feedback after completed cleanings."
        />
      </div>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Saved addresses</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {addresses.length
              ? `${addresses.length} address${addresses.length === 1 ? "" : "es"} ready for your next booking.`
              : "Add an address once and reuse it when booking."}
          </p>
          <Link href="/account/addresses" className={buttonVariants({ variant: "outline" })}>
            <MapPin className="size-4" />
            Manage addresses
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

function QuickLink({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: typeof Repeat;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="grid gap-3 rounded-lg border bg-card p-4 hover:bg-muted/50"
    >
      <Icon className="size-5 text-primary" />
      <div>
        <p className="font-medium">{title}</p>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>
    </Link>
  );
}

function SummaryCard({ title, value }: { title: string; value: string }) {
  return (
    <Card className="rounded-lg">
      <CardContent>
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="mt-2 text-3xl font-semibold tracking-normal">{value}</p>
      </CardContent>
    </Card>
  );
}

function BookingSection({
  title,
  bookings,
  empty,
}: {
  title: string;
  bookings: BookingWithService[];
  empty: string;
}) {
  return (
    <Card className="rounded-lg">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {bookings.length ? (
          bookings.map((booking) => (
            <Link
              key={booking.id}
              href={`/account/bookings/${booking.id}`}
              className="grid gap-3 rounded-lg border bg-background p-4 hover:bg-muted/50 sm:grid-cols-[1fr_auto] sm:items-center"
            >
              <div className="grid gap-1">
                <p className="font-mono text-xs text-muted-foreground">
                  {booking.booking_reference}
                </p>
                <p className="font-medium">{booking.service_name}</p>
                <p className="text-sm text-muted-foreground">
                  <CalendarDays className="mr-1 inline size-4" />
                  {formatBookingDateTime(booking.booking_date, booking.booking_time)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{booking.status}</Badge>
                <ArrowRight className="size-4 text-muted-foreground" />
              </div>
            </Link>
          ))
        ) : (
          <p className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">
            {empty}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function formatBookingDateTime(date: string, time: string) {
  const formattedDate = new Intl.DateTimeFormat("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));

  return `${formattedDate} at ${time.slice(0, 5)}`;
}
