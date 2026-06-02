import Link from "next/link";
import { Eye, Pencil, Plus } from "lucide-react";

import { setCleanerActive } from "@/app/actions";
import { SupabaseSetupNotice } from "@/components/admin/supabase-setup-notice";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { getCleaners } from "@/lib/supabase/queries";
import type { Cleaner } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminCleanersPage() {
  if (!hasSupabaseConfig()) {
    return <SupabaseSetupNotice backHref="/admin/bookings" />;
  }

  const cleaners = await getCleanersOrSetupNotice();

  if (!cleaners) {
    return <SupabaseSetupNotice schemaMissing backHref="/admin/bookings" />;
  }

  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto grid w-full max-w-7xl gap-6 px-5 py-6 sm:px-8 lg:px-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">Cleaner operations</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal sm:text-4xl">
              Cleaners
            </h1>
            <p className="mt-3 text-muted-foreground">
              Manage cleaner profiles, specialties, availability, and active status.
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/admin/bookings"
              className={buttonVariants({ variant: "outline" })}
            >
              Bookings
            </Link>
            <Link href="/admin/cleaners/new" className={buttonVariants()}>
              <Plus className="size-4" />
              Add cleaner
            </Link>
          </div>
        </div>

        <Card className="rounded-lg">
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <CardTitle>All cleaners</CardTitle>
              <Badge variant="secondary">{cleaners.length} total</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {cleaners.length ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cleaner name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Specialties</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Completed jobs</TableHead>
                      <TableHead>Active status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cleaners.map((cleaner) => (
                      <TableRow key={cleaner.id}>
                        <TableCell className="font-medium">
                          {cleaner.full_name}
                        </TableCell>
                        <TableCell>{cleaner.phone}</TableCell>
                        <TableCell>{cleaner.email}</TableCell>
                        <TableCell>
                          <SpecialtyList cleaner={cleaner} />
                        </TableCell>
                        <TableCell>{cleaner.rating.toFixed(1)}</TableCell>
                        <TableCell>{cleaner.completed_jobs}</TableCell>
                        <TableCell>
                          <div className="grid gap-2">
                            <ActiveBadge active={cleaner.active} />
                            <form action={setCleanerActive}>
                              <input
                                type="hidden"
                                name="cleaner_id"
                                value={cleaner.id}
                              />
                              <input
                                type="hidden"
                                name="active"
                                value={cleaner.active ? "false" : "true"}
                              />
                              <Button type="submit" size="sm" variant="outline">
                                {cleaner.active ? "Deactivate" : "Activate"}
                              </Button>
                            </form>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Link
                              href={`/admin/cleaners/${cleaner.id}`}
                              className={buttonVariants({
                                variant: "outline",
                                size: "icon",
                              })}
                              aria-label={`View ${cleaner.full_name}`}
                            >
                              <Eye className="size-4" />
                            </Link>
                            <Link
                              href={`/admin/cleaners/${cleaner.id}/edit`}
                              className={buttonVariants({
                                variant: "outline",
                                size: "icon",
                              })}
                              aria-label={`Edit ${cleaner.full_name}`}
                            >
                              <Pencil className="size-4" />
                            </Link>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="grid min-h-52 place-items-center rounded-lg border border-dashed text-center">
                <div className="grid gap-3">
                  <p className="font-medium">No cleaners yet</p>
                  <p className="text-sm text-muted-foreground">
                    Add cleaner profiles before assigning booking work.
                  </p>
                  <Link
                    href="/admin/cleaners/new"
                    className={buttonVariants({ className: "mx-auto w-fit" })}
                  >
                    Add cleaner
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

function SpecialtyList({ cleaner }: { cleaner: Cleaner }) {
  return (
    <div className="flex max-w-80 flex-wrap gap-1">
      {cleaner.specialties.map((specialty) => (
        <Badge key={specialty} variant="outline">
          {specialty}
        </Badge>
      ))}
    </div>
  );
}

function ActiveBadge({ active }: { active: boolean }) {
  return (
    <Badge variant={active ? "secondary" : "outline"} className="w-fit">
      {active ? "Active" : "Inactive"}
    </Badge>
  );
}

async function getCleanersOrSetupNotice() {
  try {
    return await getCleaners();
  } catch (error) {
    if (isSupabaseSchemaMissingError(error)) {
      return null;
    }

    throw error;
  }
}
