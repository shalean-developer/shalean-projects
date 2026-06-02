import Link from "next/link";
import { Bot, RefreshCw } from "lucide-react";

import {
  generateRecurringBookingsNowAction,
  runAdminAutomationSweepAction,
} from "@/app/actions";
import { AdminPage } from "@/components/admin/admin-page";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getV15SchemaStatus } from "@/lib/supabase/schema";
import { getAutomationLogs } from "@/lib/supabase/queries";
import type { AutomationLog } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminAutomationPage() {
  const schema = await getV15SchemaStatus();

  if (!schema.ready) {
    return <SetupNotice message={schema.message} />;
  }

  const logs = await getAutomationLogs();

  return (
    <AdminPage
      eyebrow="Admin dashboard"
      title="Automation"
      description="Monitor reminders, recurring generation, follow-ups, review requests, and invoice notifications."
    >
        <div className="grid gap-4 md:grid-cols-3">
          <SummaryCard title="Total logs" value={String(logs.length)} />
          <SummaryCard
            title="Email logs"
            value={String(logs.filter((log) => log.channel === "Email").length)}
          />
          <SummaryCard
            title="WhatsApp-ready"
            value={String(logs.filter((log) => log.channel === "WhatsApp").length)}
          />
        </div>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Run automation</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row">
            <form action={runAdminAutomationSweepAction}>
              <Button type="submit" className="w-full sm:w-auto">
                <Bot className="size-4" />
                Run full sweep
              </Button>
            </form>
            <form action={generateRecurringBookingsNowAction}>
              <Button type="submit" variant="outline" className="w-full sm:w-auto">
                <RefreshCw className="size-4" />
                Generate due bookings
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Automation log table</CardTitle>
              <Badge variant="secondary">{logs.length} records</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {logs.length ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Channel</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Booking</TableHead>
                      <TableHead>Sent at</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <LogRow key={log.id} log={log} />
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="grid min-h-44 place-items-center rounded-lg border border-dashed text-center">
                <div>
                  <p className="font-medium">No automation logs yet</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Run a sweep or wait for automated actions to record here.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
    </AdminPage>
  );
}

function SummaryCard({ title, value }: { title: string; value: string }) {
  return (
    <Card className="rounded-lg">
      <CardContent>
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="mt-2 text-3xl font-semibold tracking-normal">{value}</p>
      </CardContent>
    </Card>
  );
}

function LogRow({ log }: { log: AutomationLog }) {
  return (
    <TableRow>
      <TableCell>{log.automation_type}</TableCell>
      <TableCell>
        <Badge variant="outline">{log.channel}</Badge>
      </TableCell>
      <TableCell>{log.status}</TableCell>
      <TableCell>
        <div className="grid gap-1">
          <span>{log.customer?.full_name ?? "Customer"}</span>
          <span className="text-xs text-muted-foreground">
            {log.customer?.email ?? "No email"}
          </span>
        </div>
      </TableCell>
      <TableCell className="font-mono text-xs">
        {log.booking ? (
          <Link href={`/admin/bookings/${log.booking.id}`} className="hover:underline">
            {log.booking.booking_reference}
          </Link>
        ) : (
          "None"
        )}
      </TableCell>
      <TableCell>{log.sent_at ? formatTimestamp(log.sent_at) : "Not sent"}</TableCell>
      <TableCell>{formatTimestamp(log.created_at)}</TableCell>
    </TableRow>
  );
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-ZA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function SetupNotice({ message }: { message?: string }) {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-5">
      <Card className="w-full max-w-xl rounded-lg">
        <CardHeader>
          <CardTitle>Supabase V1.5 migration is required</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm leading-6 text-muted-foreground">
          <p>{message}</p>
          <Link href="/admin/bookings" className={buttonVariants({ className: "w-fit" })}>
            Back to bookings
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
