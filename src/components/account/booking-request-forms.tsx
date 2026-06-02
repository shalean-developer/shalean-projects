"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarClock, XCircle } from "lucide-react";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { createBookingRequest } from "@/app/actions";
import {
  bookingRequestSchema,
  type BookingRequestValues,
} from "@/lib/account-schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type RequestFormsProps = {
  bookingId: string;
  canReschedule: boolean;
  canCancel: boolean;
};

export function BookingRequestForms({
  bookingId,
  canReschedule,
  canCancel,
}: RequestFormsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <RescheduleRequestForm bookingId={bookingId} disabled={!canReschedule} />
      <CancelRequestForm bookingId={bookingId} disabled={!canCancel} />
    </div>
  );
}

function RescheduleRequestForm({
  bookingId,
  disabled,
}: {
  bookingId: string;
  disabled: boolean;
}) {
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const form = useForm<BookingRequestValues>({
    resolver: zodResolver(bookingRequestSchema),
    defaultValues: {
      bookingId,
      requestType: "Reschedule",
      requestedDate: "",
      requestedTime: "",
      reason: "",
    },
  });

  function onSubmit(values: BookingRequestValues) {
    setMessage("");
    startTransition(async () => {
      try {
        await createBookingRequest(values);
        form.reset({
          bookingId,
          requestType: "Reschedule",
          requestedDate: "",
          requestedTime: "",
          reason: "",
        });
        setMessage("Reschedule request sent.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Request failed.");
      }
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-3 rounded-lg border bg-background p-4">
      <div className="flex items-center gap-2">
        <CalendarClock className="size-4 text-primary" />
        <p className="font-medium">Reschedule request</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Preferred date" error={form.formState.errors.requestedDate?.message}>
          <Input type="date" disabled={disabled} {...form.register("requestedDate")} />
        </Field>
        <Field label="Preferred time" error={form.formState.errors.requestedTime?.message}>
          <Input type="time" disabled={disabled} {...form.register("requestedTime")} />
        </Field>
      </div>
      <Field label="Reason" error={form.formState.errors.reason?.message}>
        <Textarea className="min-h-24" disabled={disabled} {...form.register("reason")} />
      </Field>
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      <Button type="submit" disabled={disabled || isPending}>
        {isPending ? "Sending" : "Request reschedule"}
      </Button>
    </form>
  );
}

function CancelRequestForm({
  bookingId,
  disabled,
}: {
  bookingId: string;
  disabled: boolean;
}) {
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const form = useForm<BookingRequestValues>({
    resolver: zodResolver(bookingRequestSchema),
    defaultValues: {
      bookingId,
      requestType: "Cancel",
      requestedDate: "",
      requestedTime: "",
      reason: "",
    },
  });

  function onSubmit(values: BookingRequestValues) {
    setMessage("");
    startTransition(async () => {
      try {
        await createBookingRequest(values);
        form.reset({
          bookingId,
          requestType: "Cancel",
          requestedDate: "",
          requestedTime: "",
          reason: "",
        });
        setMessage("Cancel request sent.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Request failed.");
      }
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-3 rounded-lg border bg-background p-4">
      <div className="flex items-center gap-2">
        <XCircle className="size-4 text-destructive" />
        <p className="font-medium">Cancel request</p>
      </div>
      <Field label="Cancellation reason" error={form.formState.errors.reason?.message}>
        <Textarea className="min-h-32" disabled={disabled} {...form.register("reason")} />
      </Field>
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      <Button type="submit" variant="destructive" disabled={disabled || isPending}>
        {isPending ? "Sending" : "Request cancellation"}
      </Button>
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      {children}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
