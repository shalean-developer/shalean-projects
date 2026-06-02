import Link from "next/link";

import { BookingForm } from "@/components/booking/booking-form";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { services } from "@/config/services";
import { getOptionalCustomer } from "@/lib/auth";
import { hasSupabaseConfig } from "@/lib/supabase/admin";
import { getCustomerAddresses } from "@/lib/supabase/queries";
import { getPaymentSchemaStatus } from "@/lib/supabase/schema";

export const dynamic = "force-dynamic";

export default async function BookPage() {
  if (!hasSupabaseConfig()) {
    return <SupabaseSetupNotice />;
  }

  const paymentSchema = await getPaymentSchemaStatus();

  if (!paymentSchema.ready) {
    return <SupabaseSetupNotice schemaMissing message={paymentSchema.message} />;
  }

  const account = await getOptionalCustomer();
  const addresses = account
    ? await getCustomerAddresses(account.customer.id)
    : [];

  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto grid w-full max-w-6xl gap-6 px-5 py-6 sm:px-8 lg:px-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">Book a cleaning</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal sm:text-4xl">
              Build your service-specific booking
            </h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Choose the service, answer the details Shalean needs, add extras,
              and review the full estimate before submitting.
            </p>
          </div>
          <Link href="/" className={buttonVariants({ variant: "outline" })}>
            Back home
          </Link>
        </div>
        <BookingForm
          services={services}
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
        />
      </section>
    </main>
  );
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
      <Card className="w-full max-w-xl rounded-lg">
        <CardHeader>
          <CardTitle>
            {schemaMissing
              ? "Supabase V1.3 payments migration is required"
              : "Supabase is not configured yet"}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm leading-6 text-muted-foreground">
          <p>
            {message ??
              "Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to your local environment, then run the SQL migration in `supabase/migrations`."}
          </p>
          <Link href="/" className={buttonVariants({ className: "w-fit" })}>
            Back home
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
