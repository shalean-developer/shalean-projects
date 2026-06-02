import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarPlus, Pencil, Trash2 } from "lucide-react";

import {
  addCleanerAvailability,
  deleteCleanerAvailability,
} from "@/app/actions";
import { SupabaseSetupNotice } from "@/components/admin/supabase-setup-notice";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { hasSupabaseConfig } from "@/lib/supabase/admin";
import { isSupabaseSchemaMissingError } from "@/lib/supabase/errors";
import { getCleanerById } from "@/lib/supabase/queries";

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

  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto grid w-full max-w-6xl gap-6 px-5 py-6 sm:px-8 lg:px-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">Cleaner profile</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal sm:text-4xl">
              {cleaner.full_name}
            </h1>
            <p className="mt-3 text-muted-foreground">
              {cleaner.email} - {cleaner.phone}
            </p>
          </div>
          <div className="flex gap-3">
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
          </div>
        </div>

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
                <CardTitle>Add availability</CardTitle>
              </CardHeader>
              <CardContent>
                <form
                  action={addCleanerAvailability}
                  className="grid gap-4 md:grid-cols-[1fr_1fr_1fr_180px_auto]"
                >
                  <input type="hidden" name="cleaner_id" value={cleaner.id} />
                  <Field label="Date">
                    <Input name="available_date" type="date" required />
                  </Field>
                  <Field label="Start Time">
                    <Input name="start_time" type="time" required />
                  </Field>
                  <Field label="End Time">
                    <Input name="end_time" type="time" required />
                  </Field>
                  <Field label="Availability Status">
                    <select
                      name="is_available"
                      defaultValue="true"
                      className="h-8 rounded-lg border border-input bg-background px-3 text-sm"
                    >
                      <option value="true">Available</option>
                      <option value="false">Unavailable</option>
                    </select>
                  </Field>
                  <div className="flex items-end">
                    <Button type="submit" className="w-full">
                      <CalendarPlus className="size-4" />
                      Add
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card className="rounded-lg">
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                  <CardTitle>Availability</CardTitle>
                  <Badge variant="secondary">
                    {cleaner.availability.length} slots
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {cleaner.availability.length ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Start Time</TableHead>
                          <TableHead>End Time</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Remove</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cleaner.availability.map((slot) => (
                          <TableRow key={slot.id}>
                            <TableCell>{formatDate(slot.available_date)}</TableCell>
                            <TableCell>{slot.start_time.slice(0, 5)}</TableCell>
                            <TableCell>{slot.end_time.slice(0, 5)}</TableCell>
                            <TableCell>
                              <Badge
                                variant={slot.is_available ? "secondary" : "outline"}
                              >
                                {slot.is_available ? "Available" : "Unavailable"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <form action={deleteCleanerAvailability}>
                                <input
                                  type="hidden"
                                  name="cleaner_id"
                                  value={cleaner.id}
                                />
                                <input
                                  type="hidden"
                                  name="availability_id"
                                  value={slot.id}
                                />
                                <Button
                                  type="submit"
                                  variant="destructive"
                                  size="icon"
                                  aria-label="Remove availability"
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              </form>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="grid min-h-44 place-items-center rounded-lg border border-dashed text-center">
                    <div className="grid gap-2">
                      <p className="font-medium">No availability added</p>
                      <p className="text-sm text-muted-foreground">
                        Add date and time windows before assigning bookings.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </main>
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

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      {children}
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
