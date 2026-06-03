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
import type { BookingAssignment, Cleaner } from "@/lib/types";

type CleanerAssignmentControlsProps = {
  bookingId: string;
  currentAssignments: BookingAssignment[];
  matchingCleaners: Cleaner[];
};

export function CleanerAssignmentControls({
  bookingId,
  currentAssignments,
  matchingCleaners,
}: CleanerAssignmentControlsProps) {
  const activeAssignments = currentAssignments.filter(
    (assignment) => assignment.assignment_status !== "Cancelled"
  );
  const assignedCleanerIds = new Set(
    activeAssignments.map((assignment) => assignment.cleaner_id)
  );
  const assignableCleaners = matchingCleaners.filter(
    (cleaner) => !assignedCleanerIds.has(cleaner.id)
  );
  const [selectedCleanerId, setSelectedCleanerId] = useState(
    assignableCleaners[0]?.id ?? ""
  );

  return (
    <div className="grid gap-3">
      {activeAssignments.length ? (
        <div className="grid gap-2">
          {activeAssignments.map((assignment) => (
            <div
              key={assignment.id}
              className="grid gap-3 rounded-lg border bg-background p-3 sm:grid-cols-[1fr_auto] sm:items-center"
            >
              <div>
                <p className="font-medium">
                  {assignment.cleaner?.full_name ?? "Assigned cleaner"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {assignment.is_team_leader ? "Team leader" : "Team member"}
                </p>
              </div>
              <form action={removeCleanerAssignment}>
                <input type="hidden" name="booking_id" value={bookingId} />
                <input
                  type="hidden"
                  name="current_cleaner_id"
                  value={assignment.cleaner_id}
                />
                <RemoveAssignmentButton />
              </form>
            </div>
          ))}
        </div>
      ) : null}

      {assignableCleaners.length ? (
        <form
          action={assignCleanerToBooking}
          className="grid gap-3"
        >
          <input type="hidden" name="booking_id" value={bookingId} />
          <input type="hidden" name="cleaner_id" value={selectedCleanerId} />
          <label className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm">
            <input name="manual_override" type="checkbox" className="size-4" />
            Manual override
          </label>
          <label className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm">
            <input name="is_team_leader" type="checkbox" className="size-4" />
            Team leader
          </label>
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
              {assignableCleaners.map((cleaner) => (
                <SelectItem key={cleaner.id} value={cleaner.id}>
                  {cleaner.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <AssignmentButton />
        </form>
      ) : (
        <div className="rounded-lg border border-dashed bg-background p-4 text-sm text-muted-foreground">
          No more available cleaners found for this booking time.
        </div>
      )}
    </div>
  );
}

function AssignmentButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Saving" : "Add cleaner"}
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
