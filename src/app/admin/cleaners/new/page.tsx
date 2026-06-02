import Link from "next/link";

import { AdminPage } from "@/components/admin/admin-page";
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
    <AdminPage
      eyebrow="Cleaner operations"
      title="Add cleaner"
      description="Create a cleaner profile with specialties and operations metrics."
      actions={
        <Link
          href="/admin/cleaners"
          className={buttonVariants({ variant: "outline" })}
        >
          Back to cleaners
        </Link>
      }
    >
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Cleaner profile</CardTitle>
          </CardHeader>
          <CardContent>
            <CleanerForm />
          </CardContent>
        </Card>
    </AdminPage>
  );
}
