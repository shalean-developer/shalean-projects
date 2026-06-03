import Link from "next/link";

import { BookingForm } from "@/components/booking/booking-form";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getOptionalCustomer } from "@/lib/auth";
import { hasSupabaseConfig } from "@/lib/supabase/admin";
import {
  getCleaners,
  getCustomerAddresses,
  getServiceConfigs,
} from "@/lib/supabase/queries";
import { getPaymentSchemaStatus } from "@/lib/supabase/schema";

export const dynamic = "force-dynamic";

type BookPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function BookPage({ searchParams }: BookPageProps) {
  if (!hasSupabaseConfig()) {
    return <SupabaseSetupNotice />;
  }

  const paymentSchema = await getPaymentSchemaStatus();

  if (!paymentSchema.ready) {
    return <SupabaseSetupNotice schemaMissing message={paymentSchema.message} />;
  }

  const account = await getOptionalCustomer();
  const params = await searchParams;
  const initialServiceSlug = getSearchParam(params.service);
  const initialStepSlug = getSearchParam(params.step);
  const [addresses, cleaners, services] = await Promise.all([
    account ? getCustomerAddresses(account.customer.id) : Promise.resolve([]),
    getCleaners(),
    getServiceConfigs(),
  ]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(222,246,233,0.85),transparent_34rem),var(--background)]">
      <BookingForm
        services={services}
        cleaners={cleaners.filter((cleaner) => cleaner.active)}
        customer={
          account
            ? {
                fullName: account.customer.full_name,
                email: account.customer.email,
                phone: account.customer.phone ?? "",
              }
            : null
        }
        savedAddresses={addresses}
        initialServiceSlug={initialServiceSlug}
        initialStepSlug={initialStepSlug}
        customerName={account?.customer.full_name ?? null}
        loggedIn={Boolean(account)}
      />
    </main>
  );
}

function getSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function SupabaseSetupNotice({
  schemaMissing = false,
  message,
}: {
  schemaMissing?: boolean;
  message?: string;
}) {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-5">
      <Card className="w-full max-w-xl rounded-lg border border-border/80 bg-card shadow-sm">
        <CardHeader className="px-6 pt-6">
          <CardTitle className="text-xl">
            {schemaMissing
              ? "Supabase V1.3 payments migration is required"
              : "Supabase is not configured yet"}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 px-6 pb-6 text-sm leading-6 text-muted-foreground">
          <p>
            {message ??
              "Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to your local environment, then run the SQL migration in `supabase/migrations`."}
          </p>
          <Link
            href="/"
            className={buttonVariants({ className: "h-11 w-fit px-4" })}
          >
            Back home
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
