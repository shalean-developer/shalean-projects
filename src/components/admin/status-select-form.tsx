"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

import { updateBookingStatus } from "@/app/actions";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { bookingStatuses, type BookingStatus } from "@/lib/types";

type StatusSelectFormProps = {
  bookingId: string;
  status: BookingStatus;
};

export function StatusSelectForm({ bookingId, status }: StatusSelectFormProps) {
  const [selectedStatus, setSelectedStatus] = useState<BookingStatus>(status);

  return (
    <form
      action={updateBookingStatus}
      className="flex min-w-52 items-center gap-2"
    >
      <input type="hidden" name="booking_id" value={bookingId} />
      <Select
        name="status"
        value={selectedStatus}
        onValueChange={(value) => setSelectedStatus(value as BookingStatus)}
        required
      >
        <SelectTrigger className="h-9 w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {bookingStatuses.map((bookingStatus) => (
            <SelectItem key={bookingStatus} value={bookingStatus}>
              {bookingStatus}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <StatusButton />
    </form>
  );
}

function StatusButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" size="sm" variant="outline" disabled={pending}>
      {pending ? "Saving" : "Update"}
    </Button>
  );
}
