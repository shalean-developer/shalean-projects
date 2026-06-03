import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";

import { AdminPage } from "@/components/admin/admin-page";
import { SupabaseSetupNotice } from "@/components/admin/supabase-setup-notice";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { hasSupabaseConfig } from "@/lib/supabase/admin";
import { isSupabaseSchemaMissingError } from "@/lib/supabase/errors";
import {
  getBookingsByCleanerId,
  getCleanerById,
  getCleanerLeaveRequests,
} from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export default async function CleanerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!hasSupabaseConfig()) {
    return <SupabaseSetupNotice backHref="/admin/cleaners" />;
  }

  const { id } = await params;
  const cleaner = await getCleanerOrSetupNotice(id);

  if (cleaner === "schema-missing") {
    return <SupabaseSetupNotice schemaMissing backHref="/admin/cleaners" />;
  }

  if (!cleaner) {
    notFound();
  }

  const [leaveRequests, bookings] = await Promise.all([
    getCleanerLeaveRequests(cleaner.id),
    getBookingsByCleanerId(cleaner.id),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  const upcomingBookings = bookings.filter(
    (booking) => booking.booking_date >= today && booking.status !== "Cancelled"
  );

  return (
    <AdminPage
      eyebrow="Cleaner profile"
      title={cleaner.full_name}
      description={`${cleaner.email} - ${cleaner.phone}`}
      actions={
        <>
          <Link
            href="/admin/cleaners"
            className={buttonVariants({ variant: "outline" })}
          >
            Back
          </Link>
          <Link
            href={`/admin/cleaners/${cleaner.id}/edit`}
            className={buttonVariants()}
          >
            <Pencil className="size-4" />
            Edit
          </Link>
        </>
      }
    >
        <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
          <Card className="h-fit rounded-lg">
            <CardHeader>
              <CardTitle>Profile</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              {cleaner.profile_photo ? (
                <div
                  role="img"
                  aria-label={cleaner.full_name}
                  className="aspect-[4/3] w-full rounded-lg bg-cover bg-center"
                  style={{ backgroundImage: `url(${cleaner.profile_photo})` }}
                />
              ) : (
                <div className="grid aspect-[4/3] place-items-center rounded-lg border border-dashed bg-muted text-sm text-muted-foreground">
                  No profile photo
                </div>
              )}
              <DetailRow label="Active Status" value={cleaner.active ? "Active" : "Inactive"} />
              <DetailRow label="Rating" value={cleaner.rating.toFixed(1)} />
              <DetailRow
                label="Completed Jobs"
                value={String(cleaner.completed_jobs)}
              />
              <DetailRow
                label="Working Days"
                value={cleaner.working_days.join(", ")}
              />
              <DetailRow
                label="Working Hours"
                value={`${cleaner.working_start_time.slice(0, 5)} - ${cleaner.working_end_time.slice(0, 5)}`}
              />
              <Separator />
              <div className="grid gap-2">
                <p className="text-sm text-muted-foreground">Specialties</p>
                <div className="flex flex-wrap gap-1">
                  {cleaner.specialties.map((specialty) => (
                    <Badge key={specialty} variant="outline">
                      {specialty}
                    </Badge>
                  ))}
                </div>
              </div>
              {cleaner.bio ? (
                <>
                  <Separator />
                  <p className="text-sm leading-6 text-muted-foreground">
                    {cleaner.bio}
                  </p>
                </>
              ) : null}
            </CardContent>
          </Card>

          <div className="grid gap-5">
            <Card className="rounded-lg">
              <CardHeader>
                <CardTitle>Working schedule</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                <DetailRow
                  label="Working Days"
                  value={cleaner.working_days.join(", ")}
                />
                <DetailRow
                  label="Working Hours"
                  value={`${cleaner.working_start_time.slice(0, 5)} - ${cleaner.working_end_time.slice(0, 5)}`}
                />
                <Link
                  href={`/admin/cleaners/${cleaner.id}/edit`}
                  className={buttonVariants({ variant: "outline", className: "w-fit" })}
                >
                  Edit schedule
                </Link>
              </CardContent>
            </Card>

            <Card className="rounded-lg">
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                  <CardTitle>Leave requests</CardTitle>
                  <Badge variant="secondary">{leaveRequests.length} total</Badge>
                </div>
              </CardHeader>
              <CardContent className="grid gap-3">
                {leaveRequests.length ? (
                  leaveRequests.map((request) => (
                    <div key={request.id} className="grid gap-2 rounded-lg border bg-background p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium">{request.request_type}</p>
                        <Badge variant={request.status === "Approved" ? "default" : "secondary"}>
                          {request.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(request.start_date)} - {formatDate(request.end_date)}
                      </p>
                      <p className="text-sm text-muted-foreground">{request.reason}</p>
                    </div>
                  ))
                ) : (
                  <div className="grid min-h-32 place-items-center rounded-lg border border-dashed text-center">
                    <p className="text-sm text-muted-foreground">
                      No leave requests submitted.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-lg">
              <CardHeader>
                <CardTitle>Upcoming bookings</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                {upcomingBookings.length ? (
                  upcomingBookings.slice(0, 8).map((booking) => (
                    <Link
                      key={booking.id}
                      href={`/admin/bookings/${booking.id}`}
                      className="rounded-lg border bg-background p-3 text-sm hover:bg-muted/50"
                    >
                      <p className="font-medium">{booking.service_name}</p>
                      <p className="text-muted-foreground">
                        {booking.booking_date} at {booking.booking_time.slice(0, 5)} - {booking.suburb}
                      </p>
                    </Link>
                  ))
                ) : (
                  <p className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">
                    No upcoming bookings assigned.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
    </AdminPage>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

async function getCleanerOrSetupNotice(cleanerId: string) {
  try {
    return await getCleanerById(cleanerId);
  } catch (error) {
    if (isSupabaseSchemaMissingError(error)) {
      return "schema-missing" as const;
    }

    throw error;
  }
}
