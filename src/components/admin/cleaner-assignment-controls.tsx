"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

import {
  assignCleanerToBooking,
  removeCleanerAssignment,
} from "@/app/actions";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Cleaner } from "@/lib/types";

type CleanerAssignmentControlsProps = {
  bookingId: string;
  currentCleanerId: string | null;
  matchingCleaners: Cleaner[];
};

export function CleanerAssignmentControls({
  bookingId,
  currentCleanerId,
  matchingCleaners,
}: CleanerAssignmentControlsProps) {
  const [selectedCleanerId, setSelectedCleanerId] = useState(
    matchingCleaners[0]?.id ?? ""
  );

  function confirmReassignment(event: React.FormEvent<HTMLFormElement>) {
    if (
      currentCleanerId &&
      selectedCleanerId &&
      selectedCleanerId !== currentCleanerId &&
      !window.confirm("Reassign this booking to a different cleaner?")
    ) {
      event.preventDefault();
    }
  }

  return (
    <div className="grid gap-3">
      {matchingCleaners.length ? (
        <form
          action={assignCleanerToBooking}
          onSubmit={confirmReassignment}
          className="grid gap-3"
        >
          <input type="hidden" name="booking_id" value={bookingId} />
          <input
            type="hidden"
            name="current_cleaner_id"
            value={currentCleanerId ?? ""}
          />
          <input type="hidden" name="cleaner_id" value={selectedCleanerId} />
          <Select
            value={selectedCleanerId}
            onValueChange={(value) => {
              if (value) {
                setSelectedCleanerId(value);
              }
            }}
            required
          >
            <SelectTrigger className="h-9 w-full">
              <SelectValue placeholder="Select cleaner" />
            </SelectTrigger>
            <SelectContent>
              {matchingCleaners.map((cleaner) => (
                <SelectItem key={cleaner.id} value={cleaner.id}>
                  {cleaner.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <AssignmentButton hasCurrentCleaner={Boolean(currentCleanerId)} />
        </form>
      ) : (
        <div className="rounded-lg border border-dashed bg-background p-4 text-sm text-muted-foreground">
          No available cleaner found for this booking time.
        </div>
      )}

      {currentCleanerId ? (
        <form action={removeCleanerAssignment}>
          <input type="hidden" name="booking_id" value={bookingId} />
          <input
            type="hidden"
            name="current_cleaner_id"
            value={currentCleanerId}
          />
          <RemoveAssignmentButton />
        </form>
      ) : null}
    </div>
  );
}

function AssignmentButton({
  hasCurrentCleaner,
}: {
  hasCurrentCleaner: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending
        ? "Saving"
        : hasCurrentCleaner
          ? "Reassign cleaner"
          : "Assign cleaner"}
    </Button>
  );
}

function RemoveAssignmentButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant="destructive"
      disabled={pending}
      className="w-full"
    >
      {pending ? "Removing" : "Remove assignment"}
    </Button>
  );
}
