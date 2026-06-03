import Link from "next/link";

import { AdminBookingForm } from "@/components/admin/admin-booking-form";
import { AdminPage } from "@/components/admin/admin-page";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCustomers, getServiceConfigs } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export default async function AdminNewBookingPage() {
  const [customers, services] = await Promise.all([
    getCustomers(),
    getServiceConfigs({ includeInactive: true }),
  ]);

  return (
    <AdminPage
      eyebrow="Admin dashboard"
      title="Create booking"
      description="Create a draft or pending-invoice booking without immediate payment."
      actions={
        <Link href="/admin/bookings" className={buttonVariants({ variant: "outline" })}>
          Back to bookings
        </Link>
      }
    >
      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Booking details</CardTitle>
        </CardHeader>
          <CardContent>
            <AdminBookingForm customers={customers} services={services} />
        </CardContent>
      </Card>
    </AdminPage>
  );
}
