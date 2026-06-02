import { NotificationCenter } from "@/components/platform/notification-center";
import { requireCustomer } from "@/lib/auth";
import { getNotificationsForUser } from "@/lib/supabase/queries";

export default async function AccountNotificationsPage() {
  const { customer } = await requireCustomer("/account/notifications");
  const notifications = await getNotificationsForUser(customer.user_id, "customer");

  return (
    <div className="grid gap-5">
      <div>
        <h2 className="text-3xl font-semibold tracking-normal">Alerts</h2>
        <p className="mt-2 text-muted-foreground">Booking, cleaner, payment, and support notifications.</p>
      </div>
      <NotificationCenter initialNotifications={notifications} userId={customer.user_id} role="customer" />
    </div>
  );
}
