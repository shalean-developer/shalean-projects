"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { updateCustomerProfile } from "@/app/actions";
import { profileSchema, type ProfileValues } from "@/lib/account-schema";
import type { Customer } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ProfileForm({ customer }: { customer: Customer }) {
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: customer.full_name,
      phone: customer.phone ?? "",
    },
  });

  function onSubmit(values: ProfileValues) {
    setMessage("");
    startTransition(async () => {
      try {
        await updateCustomerProfile(values);
        setMessage("Profile updated.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Profile could not be saved.");
      }
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
      <Field label="Full name" error={form.formState.errors.fullName?.message}>
        <Input autoComplete="name" {...form.register("fullName")} />
      </Field>
      <Field label="Email">
        <Input value={customer.email} disabled />
      </Field>
      <Field label="Phone" error={form.formState.errors.phone?.message}>
        <Input autoComplete="tel" {...form.register("phone")} />
      </Field>
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving" : "Save profile"}
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
