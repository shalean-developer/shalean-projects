import { addSupportMessage, createSupportTicket } from "@/app/actions";
import { StatusBadge } from "@/components/platform/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { requireCustomer } from "@/lib/auth";
import { getCustomerBookings, getCustomerSupportTickets } from "@/lib/supabase/queries";
import { supportPriorities } from "@/lib/types";

export default async function AccountSupportPage() {
  const { customer } = await requireCustomer("/account/support");
  const [tickets, bookings] = await Promise.all([
    getCustomerSupportTickets(customer.id),
    getCustomerBookings(customer.id),
  ]);

  return (
    <div className="grid gap-5">
      <div>
        <h2 className="text-3xl font-semibold tracking-normal">Support</h2>
        <p className="mt-2 text-muted-foreground">Contact support about bookings, payments, reschedules, or service quality.</p>
      </div>
      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>New support ticket</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createSupportTicket} className="grid gap-3">
            <Input name="subject" placeholder="Subject" required />
            <div className="grid gap-3 sm:grid-cols-2">
              <select name="booking_id" className="h-8 rounded-lg border bg-background px-3 text-sm">
                <option value="">No booking selected</option>
                {bookings.map((booking) => (
                  <option key={booking.id} value={booking.id}>
                    {booking.booking_reference} · {booking.service_name}
                  </option>
                ))}
              </select>
              <select name="priority" defaultValue="Medium" className="h-8 rounded-lg border bg-background px-3 text-sm">
                {supportPriorities.map((priority) => (
                  <option key={priority} value={priority}>{priority}</option>
                ))}
              </select>
            </div>
            <Textarea name="message" placeholder="How can we help?" required />
            <Button type="submit" className="w-fit">Create ticket</Button>
          </form>
        </CardContent>
      </Card>
      <div className="grid gap-4">
        {tickets.length ? (
          tickets.map((ticket) => (
            <Card key={ticket.id} className="rounded-lg">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>{ticket.subject}</CardTitle>
                    <p className="mt-2 text-sm text-muted-foreground">{ticket.booking?.booking_reference ?? "General support"}</p>
                  </div>
                  <div className="flex gap-2">
                    <StatusBadge status={ticket.priority} />
                    <StatusBadge status={ticket.status} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid gap-3">
                {(ticket.messages ?? []).map((message) => (
                  <div key={message.id} className="rounded-lg border bg-background p-3 text-sm">
                    <p className="font-medium capitalize">{message.sender_role}</p>
                    <p className="mt-1 text-muted-foreground">{message.message}</p>
                  </div>
                ))}
                <form action={addSupportMessage} className="grid gap-3">
                  <input type="hidden" name="ticket_id" value={ticket.id} />
                  <input type="hidden" name="sender_role" value="customer" />
                  <Textarea name="message" placeholder="Reply to support" required />
                  <Button type="submit" variant="outline" className="w-fit">Send reply</Button>
                </form>
              </CardContent>
            </Card>
          ))
        ) : (
          <p className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">Your support tickets will appear here.</p>
        )}
      </div>
    </div>
  );
}
