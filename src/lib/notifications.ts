import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { toSupabaseError } from "@/lib/supabase/errors";

type NotificationInput = {
  userId: string;
  userRole: "customer" | "cleaner" | "admin";
  title: string;
  message: string;
  type: string;
};

export async function createInAppNotification({
  userId,
  userRole,
  title,
  message,
  type,
}: NotificationInput) {
  const { error } = await getSupabaseAdmin().from("notifications").insert({
    user_id: userId,
    user_role: userRole,
    title,
    message,
    notification_type: type,
  });

  if (error) {
    throw toSupabaseError(error);
  }
}

export async function createCustomerInAppNotification(
  customerId: string,
  notification: Omit<NotificationInput, "userId" | "userRole">
) {
  const { data, error } = await getSupabaseAdmin()
    .from("customers")
    .select("user_id")
    .eq("id", customerId)
    .maybeSingle();

  if (error) {
    throw toSupabaseError(error);
  }

  if (!data?.user_id) {
    return;
  }

  await createInAppNotification({
    userId: String(data.user_id),
    userRole: "customer",
    ...notification,
  });
}
