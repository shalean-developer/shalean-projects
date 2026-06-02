"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import {
  createCustomerAddress,
  updateCustomerAddress,
} from "@/app/actions";
import {
  addressSchema,
  type AddressValues,
} from "@/lib/account-schema";
import type { CustomerAddress } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type AddressFormProps = {
  address?: CustomerAddress;
};

export function AddressForm({ address }: AddressFormProps) {
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const form = useForm<AddressValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      label: address?.label ?? "",
      address: address?.address ?? "",
      suburb: address?.suburb ?? "",
      city: address?.city ?? "",
      accessInstructions: address?.access_instructions ?? "",
      gateCode: address?.gate_code ?? "",
      parkingInstructions: address?.parking_instructions ?? "",
      isDefault: address?.is_default ?? false,
    },
  });

  function onSubmit(values: AddressValues) {
    setMessage("");
    startTransition(async () => {
      try {
        if (address) {
          await updateCustomerAddress(address.id, values);
          setMessage("Address updated.");
        } else {
          await createCustomerAddress(values);
          form.reset({
            label: "",
            address: "",
            suburb: "",
            city: "",
            accessInstructions: "",
            gateCode: "",
            parkingInstructions: "",
            isDefault: false,
          });
          setMessage("Address added.");
        }
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Address could not be saved.");
      }
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Label" error={form.formState.errors.label?.message}>
          <Input placeholder="Home" {...form.register("label")} />
        </Field>
        <Field label="City" error={form.formState.errors.city?.message}>
          <Input {...form.register("city")} />
        </Field>
      </div>
      <Field label="Street address" error={form.formState.errors.address?.message}>
        <Input autoComplete="street-address" {...form.register("address")} />
      </Field>
      <Field label="Suburb" error={form.formState.errors.suburb?.message}>
        <Input {...form.register("suburb")} />
      </Field>
      <Field label="Access instructions">
        <Textarea className="min-h-20" {...form.register("accessInstructions")} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Gate code">
          <Input {...form.register("gateCode")} />
        </Field>
        <Field label="Parking instructions">
          <Input {...form.register("parkingInstructions")} />
        </Field>
      </div>
      <label className="flex w-fit items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm">
        <input
          type="checkbox"
          className="size-4 accent-primary"
          {...form.register("isDefault")}
        />
        Set as default
      </label>
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving" : address ? "Update address" : "Add address"}
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
