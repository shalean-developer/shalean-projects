import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminPage } from "@/components/admin/admin-page";
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
    <AdminPage
      eyebrow="Cleaner operations"
      title="Edit cleaner"
      description="Update profile details, specialties, metrics, and active status."
      actions={
        <Link
          href={`/admin/cleaners/${cleaner.id}`}
          className={buttonVariants({ variant: "outline" })}
        >
          Back to profile
        </Link>
      }
    >
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>{cleaner.full_name}</CardTitle>
          </CardHeader>
          <CardContent>
            <CleanerForm cleaner={cleaner} />
          </CardContent>
        </Card>
    </AdminPage>
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
