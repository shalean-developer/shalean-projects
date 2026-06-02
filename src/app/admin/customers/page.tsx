import Link from "next/link";

import { AdminPage } from "@/components/admin/admin-page";
import { StatusBadge } from "@/components/platform/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getBookings, getCustomers } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export default async function AdminCustomersPage() {
  const [customers, bookings] = await Promise.all([getCustomers(), getBookings()]);

  return (
    <AdminPage title="Customers" description="Customer profiles, booking history, and repeat activity.">
      <Card className="rounded-lg">
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Bookings</TableHead>
                  <TableHead>Latest status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => {
                  const customerBookings = bookings.filter(
                    (booking) => booking.customer_id === customer.id
                  );
                  const latest = customerBookings[0];

                  return (
                    <TableRow key={customer.id}>
                      <TableCell className="font-medium">{customer.full_name}</TableCell>
                      <TableCell>{customer.email}</TableCell>
                      <TableCell>{customer.phone ?? "None"}</TableCell>
                      <TableCell>{customerBookings.length}</TableCell>
                      <TableCell>
                        {latest ? (
                          <Link href={`/admin/bookings/${latest.id}`}>
                            <StatusBadge status={latest.status} />
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">No bookings</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </AdminPage>
  );
}
