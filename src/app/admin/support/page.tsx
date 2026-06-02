import { addSupportMessage, updateSupportTicketStatus } from "@/app/actions";
import { AdminPage } from "@/components/admin/admin-page";
import { StatusBadge } from "@/components/platform/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { getSupportTickets } from "@/lib/supabase/queries";
import { supportPriorities, supportTicketStatuses } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminSupportPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    priority?: string;
    sort?: string;
  }>;
}) {
  const params = await searchParams;
  const tickets = sortTickets(
    (await getSupportTickets()).filter((ticket) => {
      const query = params.q?.trim().toLowerCase();
      const matchesStatus = !params.status || ticket.status === params.status;
      const matchesPriority =
        !params.priority || ticket.priority === params.priority;
      const matchesQuery =
        !query ||
        [
          ticket.subject,
          ticket.message,
          ticket.customer?.full_name ?? "",
          ticket.customer?.email ?? "",
          ticket.booking?.booking_reference ?? "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);

      return matchesStatus && matchesPriority && matchesQuery;
    }),
    params.sort
  );

  return (
    <AdminPage
      title="Support"
      description="Customer support tickets, threaded messages, priorities, and resolution status."
    >
      <form
        action="/admin/support"
        className="grid gap-3 rounded-lg border bg-card p-4 md:grid-cols-[1fr_190px_160px_170px_auto]"
      >
        <input
          name="q"
          defaultValue={params.q ?? ""}
          placeholder="Search tickets"
          className="h-9 rounded-lg border bg-background px-3 text-sm"
        />
        <select
          name="status"
          defaultValue={params.status ?? ""}
          className="h-9 rounded-lg border bg-background px-3 text-sm"
        >
          <option value="">All statuses</option>
          {supportTicketStatuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        <select
          name="priority"
          defaultValue={params.priority ?? ""}
          className="h-9 rounded-lg border bg-background px-3 text-sm"
        >
          <option value="">All priorities</option>
          {supportPriorities.map((priority) => (
            <option key={priority} value={priority}>
              {priority}
            </option>
          ))}
        </select>
        <select
          name="sort"
          defaultValue={params.sort ?? "updated_desc"}
          className="h-9 rounded-lg border bg-background px-3 text-sm"
        >
          <option value="updated_desc">Recently updated</option>
          <option value="priority_desc">Highest priority</option>
          <option value="customer_asc">Customer A-Z</option>
        </select>
        <Button type="submit" variant="outline">
          Filter
        </Button>
      </form>

      <div className="grid gap-4">
        {tickets.length ? (
          tickets.map((ticket) => (
            <Card key={ticket.id} className="rounded-lg">
              <CardHeader>
                <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-start">
                  <div>
                    <CardTitle>{ticket.subject}</CardTitle>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {ticket.customer?.full_name ?? "Unknown customer"} -{" "}
                      {ticket.booking?.booking_reference ?? "No booking"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge status={ticket.priority} />
                    <StatusBadge status={ticket.status} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-3">
                  {(ticket.messages ?? []).map((message) => (
                    <div
                      key={message.id}
                      className="rounded-lg border bg-background p-3 text-sm"
                    >
                      <p className="font-medium capitalize">{message.sender_role}</p>
                      <p className="mt-1 text-muted-foreground">{message.message}</p>
                    </div>
                  ))}
                </div>
                <div className="grid gap-3 lg:grid-cols-[1fr_1fr]">
                  <form
                    action={updateSupportTicketStatus}
                    className="grid gap-3 rounded-lg border bg-background p-3"
                  >
                    <input type="hidden" name="ticket_id" value={ticket.id} />
                    <div className="grid gap-2 sm:grid-cols-2">
                      <select
                        name="status"
                        defaultValue={ticket.status}
                        className="h-9 rounded-lg border bg-background px-3 text-sm"
                      >
                        {supportTicketStatuses.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                      <select
                        name="priority"
                        defaultValue={ticket.priority}
                        className="h-9 rounded-lg border bg-background px-3 text-sm"
                      >
                        {supportPriorities.map((priority) => (
                          <option key={priority} value={priority}>
                            {priority}
                          </option>
                        ))}
                      </select>
                    </div>
                    <Button type="submit">Update ticket</Button>
                  </form>
                  <form
                    action={addSupportMessage}
                    className="grid gap-3 rounded-lg border bg-background p-3"
                  >
                    <input type="hidden" name="ticket_id" value={ticket.id} />
                    <input type="hidden" name="sender_role" value="admin" />
                    <Textarea name="message" placeholder="Reply to customer" required />
                    <Button type="submit">Send reply</Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="rounded-lg">
            <CardContent>
              <p className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">
                No support tickets match these filters.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminPage>
  );
}

function sortTickets<T extends {
  customer?: { full_name: string } | null;
  priority: string;
  updated_at: string;
}>(tickets: T[], sort = "updated_desc") {
  const priorityOrder = new Map([
    ["Urgent", 4],
    ["High", 3],
    ["Medium", 2],
    ["Low", 1],
  ]);

  return [...tickets].sort((a, b) => {
    if (sort === "priority_desc") {
      return (
        (priorityOrder.get(b.priority) ?? 0) -
        (priorityOrder.get(a.priority) ?? 0)
      );
    }

    if (sort === "customer_asc") {
      return (a.customer?.full_name ?? "").localeCompare(
        b.customer?.full_name ?? ""
      );
    }

    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });
}
