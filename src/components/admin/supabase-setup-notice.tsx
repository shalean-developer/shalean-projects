import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function SupabaseSetupNotice({
  schemaMissing = false,
  backHref = "/",
}: {
  schemaMissing?: boolean;
  backHref?: string;
}) {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-5">
      <Card className="w-full max-w-xl rounded-lg">
        <CardHeader>
          <CardTitle>
            {schemaMissing
              ? "Supabase tables are not created yet"
              : "Supabase is not configured yet"}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm leading-6 text-muted-foreground">
          <p>
            {schemaMissing
              ? "Run the SQL migrations in `supabase/migrations` from the Supabase SQL Editor, then refresh this page."
              : "Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to your local environment, then run the SQL migrations in `supabase/migrations`."}
          </p>
          <Link href={backHref} className={buttonVariants({ className: "w-fit" })}>
            Back
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
