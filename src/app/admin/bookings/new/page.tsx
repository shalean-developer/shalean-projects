import Link from "next/link";

import { createAdminDraftBooking } from "@/app/actions";
import { AdminPage } from "@/components/admin/admin-page";
import { Button, buttonVariants } from "@/components/ui/button";
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
          <form action={createAdminDraftBooking} className="grid gap-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Customer">
                <select name="customer_id" required className={inputClassName}>
                  <option value="">Choose customer</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.full_name} ({customer.email})
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Service">
                <select name="service_slug" required className={inputClassName}>
                  {services.map((service) => (
                    <option key={service.slug} value={service.slug}>
                      {service.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Booking date">
                <input name="booking_date" type="date" required className={inputClassName} />
              </Field>
              <Field label="Booking time">
                <input name="booking_time" type="time" required className={inputClassName} />
              </Field>
              <Field label="Number of cleaners">
                <input
                  name="number_of_cleaners"
                  type="number"
                  min="1"
                  max="5"
                  defaultValue="1"
                  className={inputClassName}
                />
              </Field>
              <Field label="Initial status">
                <select name="status" defaultValue="Draft" className={inputClassName}>
                  <option value="Draft">Draft</option>
                  <option value="Pending Invoice">Pending Invoice</option>
                </select>
              </Field>
              <Field label="Bedrooms">
                <input name="service_data_bedrooms" type="number" min="0" defaultValue="2" className={inputClassName} />
              </Field>
              <Field label="Bathrooms">
                <input name="service_data_bathrooms" type="number" min="0" defaultValue="1" className={inputClassName} />
              </Field>
              <Field label="Total amount">
                <input name="total_amount" type="number" min="0" step="0.01" className={inputClassName} />
              </Field>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Street address">
                <input name="address" required className={inputClassName} />
              </Field>
              <Field label="Suburb">
                <input name="suburb" required className={inputClassName} />
              </Field>
              <Field label="City">
                <input name="city" required className={inputClassName} />
              </Field>
            </div>
            <Field label="Notes">
              <textarea name="notes" className={`${inputClassName} min-h-28 py-3`} />
            </Field>
            <Button type="submit" className="w-fit">
              Save booking
            </Button>
          </form>
        </CardContent>
      </Card>
    </AdminPage>
  );
}

const inputClassName =
  "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-2 text-sm">
      <span className="font-medium">{label}</span>
      {children}
    </label>
  );
}
