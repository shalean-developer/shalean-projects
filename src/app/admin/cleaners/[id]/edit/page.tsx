import Link from "next/link";
import { notFound } from "next/navigation";

import { CleanerForm } from "@/components/admin/cleaner-form";
import { SupabaseSetupNotice } from "@/components/admin/supabase-setup-notice";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { hasSupabaseConfig } from "@/lib/supabase/admin";
import { isSupabaseSchemaMissingError } from "@/lib/supabase/errors";
import { getCleanerById } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export default async function EditCleanerPage({
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
      <section className="mx-auto grid w-full max-w-4xl gap-6 px-5 py-6 sm:px-8 lg:px-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">Cleaner operations</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal sm:text-4xl">
              Edit cleaner
            </h1>
            <p className="mt-3 text-muted-foreground">
              Update profile details, specialties, metrics, and active status.
            </p>
          </div>
          <Link
            href={`/admin/cleaners/${cleaner.id}`}
            className={buttonVariants({ variant: "outline" })}
          >
            Back to profile
          </Link>
        </div>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>{cleaner.full_name}</CardTitle>
          </CardHeader>
          <CardContent>
            <CleanerForm cleaner={cleaner} />
          </CardContent>
        </Card>
      </section>
    </main>
  );
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
