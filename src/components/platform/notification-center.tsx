"use client";

import { Bell } from "lucide-react";
import { useEffect, useState } from "react";

import { markNotificationRead } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseBrowserClient, hasSupabaseAuthConfig } from "@/lib/supabase/client";
import type { Notification, UserRole } from "@/lib/types";

type NotificationCenterProps = {
  initialNotifications: Notification[];
  userId: string;
  role: UserRole;
};

export function NotificationCenter({
  initialNotifications,
  userId,
  role,
}: NotificationCenterProps) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const unread = notifications.filter((notification) => !notification.read).length;

  useEffect(() => {
    if (!hasSupabaseAuthConfig()) {
      return;
    }

    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`notifications:${userId}:${role}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setNotifications((current) => [
              payload.new as Notification,
              ...current,
            ]);
          }

          if (payload.eventType === "UPDATE") {
            setNotifications((current) =>
              current.map((item) =>
                item.id === payload.new.id ? (payload.new as Notification) : item
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [role, userId]);

  return (
    <Card className="rounded-lg">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2">
            <Bell className="size-5" />
            Notifications
          </span>
          <Badge variant={unread ? "default" : "secondary"}>{unread} unread</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {notifications.length ? (
          notifications.slice(0, 6).map((notification) => (
            <div
              key={notification.id}
              className="grid gap-2 rounded-lg border bg-background p-3 text-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{notification.title}</p>
                  <p className="mt-1 text-muted-foreground">
                    {notification.message}
                  </p>
                </div>
                {!notification.read ? (
                  <form action={markNotificationRead}>
                    <input
                      type="hidden"
                      name="notification_id"
                      value={notification.id}
                    />
                    <Button type="submit" size="sm" variant="ghost">
                      Read
                    </Button>
                  </form>
                ) : null}
              </div>
            </div>
          ))
        ) : (
          <p className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">
            No notifications yet.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
