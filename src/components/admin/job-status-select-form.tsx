"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

import { updateBookingJobStatus } from "@/app/actions";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { jobStatuses, type JobStatus } from "@/lib/types";

type JobStatusSelectFormProps = {
  bookingId: string;
  jobStatus: JobStatus;
};

export function JobStatusSelectForm({
  bookingId,
  jobStatus,
}: JobStatusSelectFormProps) {
  const [selectedStatus, setSelectedStatus] = useState<JobStatus>(jobStatus);

  return (
    <form
      action={updateBookingJobStatus}
      className="flex min-w-52 items-center gap-2"
    >
      <input type="hidden" name="booking_id" value={bookingId} />
      <Select
        name="job_status"
        value={selectedStatus}
        onValueChange={(value) => setSelectedStatus(value as JobStatus)}
        required
      >
        <SelectTrigger className="h-9 w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {jobStatuses.map((status) => (
            <SelectItem key={status} value={status}>
              {status}
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
