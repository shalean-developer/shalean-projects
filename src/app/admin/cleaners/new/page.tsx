import Link from "next/link";

import { CleanerForm } from "@/components/admin/cleaner-form";
import { SupabaseSetupNotice } from "@/components/admin/supabase-setup-notice";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { hasSupabaseConfig } from "@/lib/supabase/admin";

export default function NewCleanerPage() {
  if (!hasSupabaseConfig()) {
    return <SupabaseSetupNotice backHref="/admin/cleaners" />;
  }

  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto grid w-full max-w-4xl gap-6 px-5 py-6 sm:px-8 lg:px-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">Cleaner operations</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal sm:text-4xl">
              Add cleaner
            </h1>
            <p className="mt-3 text-muted-foreground">
              Create a cleaner profile with specialties and operations metrics.
            </p>
          </div>
          <Link
            href="/admin/cleaners"
            className={buttonVariants({ variant: "outline" })}
          >
            Back to cleaners
          </Link>
        </div>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Cleaner profile</CardTitle>
          </CardHeader>
          <CardContent>
            <CleanerForm />
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
