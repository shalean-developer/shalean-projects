import { updatePayrollStatus, upsertPayrollRecord } from "@/app/actions";
import { AdminPage } from "@/components/admin/admin-page";
import { MetricCard } from "@/components/platform/metric-card";
import { StatusBadge } from "@/components/platform/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatRand } from "@/lib/pricing";
import { getBookings, getCleaners, getPayrollRecords } from "@/lib/supabase/queries";
import { payrollStatuses } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminPayrollPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    cleaner?: string;
    status?: string;
    sort?: string;
  }>;
}) {
  const params = await searchParams;
  const [allRecords, cleaners, bookings] = await Promise.all([
    getPayrollRecords(),
    getCleaners(),
    getBookings(),
  ]);
  const records = sortPayrollRecords(
    allRecords.filter((record) => {
      const query = params.q?.trim().toLowerCase();
      const matchesCleaner =
        !params.cleaner || record.cleaner_id === params.cleaner;
      const matchesStatus = !params.status || record.status === params.status;
      const matchesQuery =
        !query ||
        [
          record.cleaner?.full_name ?? "",
          record.booking?.booking_reference ?? "",
          record.booking?.service_name ?? "",
          record.status,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);

      return matchesCleaner && matchesStatus && matchesQuery;
    }),
    params.sort
  );
  const pending = records.filter((record) => record.status === "Pending");
  const paid = records.filter((record) => record.status === "Paid");

  return (
    <AdminPage
      title="Payroll"
      description="Cleaner earnings, bonuses, deductions, approvals, and paid records."
    >
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Pending payroll"
          value={formatRand(pending.reduce((sum, record) => sum + netPayroll(record), 0))}
        />
        <MetricCard
          title="Paid payroll"
          value={formatRand(paid.reduce((sum, record) => sum + netPayroll(record), 0))}
        />
        <MetricCard title="Records" value={String(records.length)} />
      </div>

      <form
        action="/admin/payroll"
        className="grid gap-3 rounded-lg border bg-card p-4 md:grid-cols-[1fr_190px_160px_180px_auto]"
      >
        <input
          name="q"
          defaultValue={params.q ?? ""}
          placeholder="Search payroll"
          className="h-9 rounded-lg border bg-background px-3 text-sm"
        />
        <select
          name="cleaner"
          defaultValue={params.cleaner ?? ""}
          className="h-9 rounded-lg border bg-background px-3 text-sm"
        >
          <option value="">All cleaners</option>
          {cleaners.map((cleaner) => (
            <option key={cleaner.id} value={cleaner.id}>
              {cleaner.full_name}
            </option>
          ))}
        </select>
        <select
          name="status"
          defaultValue={params.status ?? ""}
          className="h-9 rounded-lg border bg-background px-3 text-sm"
        >
          <option value="">All statuses</option>
          {payrollStatuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        <select
          name="sort"
          defaultValue={params.sort ?? "created_desc"}
          className="h-9 rounded-lg border bg-background px-3 text-sm"
        >
          <option value="created_desc">Newest first</option>
          <option value="net_desc">Highest net pay</option>
          <option value="cleaner_asc">Cleaner A-Z</option>
        </select>
        <Button type="submit" variant="outline">
          Filter
        </Button>
      </form>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Add payroll adjustment</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={upsertPayrollRecord} className="grid gap-3 md:grid-cols-6">
            <select
              name="cleaner_id"
              required
              className="h-9 rounded-lg border bg-background px-3 text-sm md:col-span-2"
            >
              <option value="">Cleaner</option>
              {cleaners.map((cleaner) => (
                <option key={cleaner.id} value={cleaner.id}>
                  {cleaner.full_name}
                </option>
              ))}
            </select>
            <select
              name="booking_id"
              className="h-9 rounded-lg border bg-background px-3 text-sm md:col-span-2"
            >
              <option value="">No booking</option>
              {bookings.map((booking) => (
                <option key={booking.id} value={booking.id}>
                  {booking.booking_reference}
                </option>
              ))}
            </select>
            <Input name="amount" type="number" min="0" step="0.01" placeholder="Amount" />
            <Input
              name="bonus"
              type="number"
              min="0"
              step="0.01"
              placeholder="Bonus"
              defaultValue="0"
            />
            <Input
              name="deduction"
              type="number"
              min="0"
              step="0.01"
              placeholder="Deduction"
              defaultValue="0"
            />
            <select
              name="status"
              defaultValue="Pending"
              className="h-9 rounded-lg border bg-background px-3 text-sm"
            >
              {payrollStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <Button type="submit" className="md:col-span-2">
              Save payroll
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-lg">
        <CardContent>
          {records.length ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cleaner</TableHead>
                    <TableHead>Booking</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Bonus</TableHead>
                    <TableHead className="text-right">Deduction</TableHead>
                    <TableHead>Update</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        {record.cleaner?.full_name ?? "Unknown cleaner"}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {record.booking?.booking_reference ?? "Manual"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={record.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        {formatRand(record.amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatRand(record.bonus)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatRand(record.deduction)}
                      </TableCell>
                      <TableCell>
                        <form action={updatePayrollStatus} className="flex gap-2">
                          <input type="hidden" name="payroll_id" value={record.id} />
                          <select
                            name="status"
                            defaultValue={record.status}
                            className="h-8 rounded-lg border bg-background px-2 text-sm"
                          >
                            {payrollStatuses.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                          <Button type="submit" size="sm">
                            Save
                          </Button>
                        </form>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">
              No payroll records match these filters.
            </p>
          )}
        </CardContent>
      </Card>
    </AdminPage>
  );
}

function netPayroll(record: { amount: number; bonus: number; deduction: number }) {
  return record.amount + record.bonus - record.deduction;
}

function sortPayrollRecords<T extends {
  amount: number;
  bonus: number;
  deduction: number;
  created_at: string;
  cleaner?: { full_name: string } | null;
}>(records: T[], sort = "created_desc") {
  return [...records].sort((a, b) => {
    if (sort === "net_desc") {
      return netPayroll(b) - netPayroll(a);
    }

    if (sort === "cleaner_asc") {
      return (a.cleaner?.full_name ?? "").localeCompare(
        b.cleaner?.full_name ?? ""
      );
    }

    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}
