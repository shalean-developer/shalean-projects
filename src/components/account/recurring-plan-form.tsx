"use client";

import { startTransition, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Loader2, Plus } from "lucide-react";
import { Controller, useForm, useWatch, type FieldErrors } from "react-hook-form";

import { createRecurringBooking } from "@/app/actions";
import type { ServiceConfig, ServiceQuestion } from "@/config/services";
import {
  defaultRecurringBookingValues,
  recurringBookingSchema,
  type RecurringBookingValues,
} from "@/lib/recurring-schema";
import { calculateEstimatedTotal, formatRand, getSelectedAddons } from "@/lib/pricing";
import type { CustomerAddress } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const days = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const frequencies = ["Weekly", "Bi-weekly", "Monthly"] as const;

type RecurringPlanFormProps = {
  services: ServiceConfig[];
  savedAddresses: CustomerAddress[];
};

export function RecurringPlanForm({
  services,
  savedAddresses,
}: RecurringPlanFormProps) {
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<RecurringBookingValues>({
    resolver: zodResolver(recurringBookingSchema),
    mode: "onTouched",
    defaultValues: {
      ...defaultRecurringBookingValues,
      serviceSlug: services[0]?.slug ?? "",
      nextBookingDate: new Date().toISOString().slice(0, 10),
    },
  });

  const watchedValues = useWatch({ control: form.control });
  const values: RecurringBookingValues = {
    ...defaultRecurringBookingValues,
    ...watchedValues,
    serviceData: Object.fromEntries(
      Object.entries(watchedValues.serviceData ?? {}).filter(
        ([, value]) => value !== undefined
      )
    ) as Record<string, string | number>,
    selectedAddons: (watchedValues.selectedAddons ?? []).filter(
      (addonId): addonId is string => typeof addonId === "string"
    ),
  };
  const selectedService = useMemo(
    () => services.find((service) => service.slug === values.serviceSlug),
    [services, values.serviceSlug]
  );
  const selectedAddons = selectedService
    ? getSelectedAddons(selectedService, values.selectedAddons)
    : [];
  const estimatedTotal = selectedService
    ? calculateEstimatedTotal(selectedService, values.selectedAddons)
    : 0;

  function chooseService(service: ServiceConfig) {
    form.setValue("serviceSlug", service.slug, { shouldValidate: true });
    form.setValue("serviceData", {}, { shouldValidate: true });
    form.setValue("selectedAddons", [], { shouldValidate: true });
  }

  function chooseSavedAddress(address: CustomerAddress) {
    form.setValue("selectedAddressId", address.id, { shouldDirty: true });
    form.setValue("address", address.address, { shouldValidate: true });
    form.setValue("suburb", address.suburb, { shouldValidate: true });
    form.setValue("city", address.city, { shouldValidate: true });
    form.setValue("accessInstructions", address.access_instructions ?? "");
    form.setValue("gateCode", address.gate_code ?? "");
    form.setValue("parkingInstructions", address.parking_instructions ?? "");
    form.setValue("saveAddress", false);
  }

  function submit(valuesToSubmit: RecurringBookingValues) {
    setSubmitError("");
    setIsSubmitting(true);

    startTransition(async () => {
      try {
        const result = await createRecurringBooking(valuesToSubmit);
        window.location.assign(`/account/recurring/${result.id}`);
      } catch (error) {
        setIsSubmitting(false);
        setSubmitError(
          error instanceof Error
            ? error.message
            : "Unable to create the recurring plan right now."
        );
      }
    });
  }

  return (
    <form
      onSubmit={form.handleSubmit(submit)}
      className="grid gap-5 xl:grid-cols-[1fr_340px]"
    >
      <div className="grid gap-5">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Service</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {services.map((service) => {
                const selected = service.slug === values.serviceSlug;

                return (
                  <button
                    key={service.slug}
                    type="button"
                    onClick={() => chooseService(service)}
                    className={cn(
                      "grid min-h-36 gap-3 rounded-lg border bg-card p-4 text-left transition hover:border-primary/60",
                      selected && "border-primary bg-primary/5 ring-2 ring-primary/20"
                    )}
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span>
                        <span className="font-medium">{service.name}</span>
                        <span className="mt-2 block text-sm leading-6 text-muted-foreground">
                          {service.shortDescription}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "grid size-7 shrink-0 place-items-center rounded-full border",
                          selected && "border-primary bg-primary text-primary-foreground"
                        )}
                      >
                        {selected ? <Check className="size-4" /> : <Plus className="size-4" />}
                      </span>
                    </span>
                    <span className="text-sm font-semibold">
                      From {formatRand(service.basePrice)}
                    </span>
                  </button>
                );
              })}
            </div>
            <FieldError message={form.formState.errors.serviceSlug?.message} />
          </CardContent>
        </Card>

        {selectedService ? (
          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle>Service details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {selectedService.questions.map((question) => (
                <QuestionField
                  key={question.id}
                  question={question}
                  control={form.control}
                  register={form.register}
                  errors={form.formState.errors}
                />
              ))}
            </CardContent>
          </Card>
        ) : null}

        {selectedService ? (
          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle>Add-ons</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {selectedService.addons.map((addon) => {
                const checked = values.selectedAddons.includes(addon.id);

                return (
                  <label
                    key={addon.id}
                    className={cn(
                      "flex min-h-20 cursor-pointer items-start gap-3 rounded-lg border bg-card p-4 transition hover:border-primary/60",
                      checked && "border-primary bg-primary/5 ring-2 ring-primary/20"
                    )}
                  >
                    <input
                      type="checkbox"
                      className="mt-1 size-4 accent-primary"
                      checked={checked}
                      onChange={() => {
                        const current = form.getValues("selectedAddons");
                        form.setValue(
                          "selectedAddons",
                          checked
                            ? current.filter((id) => id !== addon.id)
                            : [...current, addon.id],
                          { shouldDirty: true, shouldValidate: true }
                        );
                      }}
                    />
                    <span className="grid gap-1">
                      <span className="font-medium">{addon.label}</span>
                      <span className="text-sm text-muted-foreground">
                        {formatRand(addon.price)}
                      </span>
                    </span>
                  </label>
                );
              })}
            </CardContent>
          </Card>
        ) : null}

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Recurring schedule</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Frequency" error={form.formState.errors.frequency?.message}>
              <Controller
                control={form.control}
                name="frequency"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="h-10 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {frequencies.map((frequency) => (
                        <SelectItem key={frequency} value={frequency}>
                          {frequency}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field label="Preferred day" error={form.formState.errors.preferredDay?.message}>
              <Controller
                control={form.control}
                name="preferredDay"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="h-10 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {days.map((day) => (
                        <SelectItem key={day} value={day}>
                          {day}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field label="Preferred time" error={form.formState.errors.preferredTime?.message}>
              <Input type="time" {...form.register("preferredTime")} />
            </Field>
            <Field label="First booking date" error={form.formState.errors.nextBookingDate?.message}>
              <Input type="date" {...form.register("nextBookingDate")} />
            </Field>
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Address</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            {savedAddresses.length ? (
              <div className="grid gap-3">
                <Label>Saved addresses</Label>
                <div className="grid gap-3 sm:grid-cols-2">
                  {savedAddresses.map((address) => {
                    const selected = values.selectedAddressId === address.id;

                    return (
                      <button
                        key={address.id}
                        type="button"
                        onClick={() => chooseSavedAddress(address)}
                        className={cn(
                          "grid min-h-24 gap-2 rounded-lg border bg-card p-4 text-left transition hover:border-primary/60",
                          selected && "border-primary bg-primary/5 ring-2 ring-primary/20"
                        )}
                      >
                        <span className="font-medium">{address.label}</span>
                        <span className="text-sm text-muted-foreground">
                          {address.address}, {address.suburb}, {address.city}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <Field label="Street address" error={form.formState.errors.address?.message}>
              <Input {...form.register("address")} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Suburb" error={form.formState.errors.suburb?.message}>
                <Input {...form.register("suburb")} />
              </Field>
              <Field label="City" error={form.formState.errors.city?.message}>
                <Input {...form.register("city")} />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Access instructions">
                <Input {...form.register("accessInstructions")} />
              </Field>
              <Field label="Gate code">
                <Input {...form.register("gateCode")} />
              </Field>
              <Field label="Parking instructions">
                <Input {...form.register("parkingInstructions")} />
              </Field>
            </div>
            <label className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                {...form.register("saveAddress")}
                disabled={Boolean(values.selectedAddressId)}
              />
              Save this address for future bookings
            </label>
            {!values.selectedAddressId ? (
              <Field label="Address label">
                <Input
                  placeholder="Home, Office, Airbnb"
                  {...form.register("addressLabel")}
                />
              </Field>
            ) : null}
          </CardContent>
        </Card>

        {submitError ? <FieldError message={submitError} /> : null}
      </div>

      <aside className="xl:sticky xl:top-6 xl:h-fit">
        <Card className="rounded-lg border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle>Plan review</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <ReviewRow label="Service" value={selectedService?.name ?? "Choose a service"} />
            <ReviewRow label="Frequency" value={values.frequency} />
            <ReviewRow label="Preferred day" value={values.preferredDay} />
            <ReviewRow label="Preferred time" value={values.preferredTime} />
            <ReviewRow label="First booking" value={values.nextBookingDate || "Choose a date"} />
            <Separator />
            <ReviewRow
              label="Add-ons"
              value={
                selectedAddons.length
                  ? selectedAddons.map((addon) => addon.label).join(", ")
                  : "None"
              }
            />
            <ReviewRow label="Estimated price" value={formatRand(estimatedTotal)} />
            <Button
              type="submit"
              size="lg"
              className="h-11"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" />
                  Creating
                </>
              ) : (
                "Create recurring plan"
              )}
            </Button>
          </CardContent>
        </Card>
      </aside>
    </form>
  );
}

function QuestionField({
  question,
  control,
  register,
  errors,
}: {
  question: ServiceQuestion;
  control: ReturnType<typeof useForm<RecurringBookingValues>>["control"];
  register: ReturnType<typeof useForm<RecurringBookingValues>>["register"];
  errors: FieldErrors<RecurringBookingValues>;
}) {
  const error = errors.serviceData?.[question.id]?.message?.toString();
  const fieldName = `serviceData.${question.id}` as const;

  if (question.type === "select") {
    return (
      <Field label={question.label} error={error}>
        <Controller
          control={control}
          name={fieldName}
          render={({ field }) => (
            <Select
              value={typeof field.value === "string" ? field.value : ""}
              onValueChange={field.onChange}
            >
              <SelectTrigger className="h-10 w-full">
                <SelectValue placeholder="Choose an option" />
              </SelectTrigger>
              <SelectContent>
                {question.options?.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </Field>
    );
  }

  if (question.type === "textarea") {
    return (
      <div className="sm:col-span-2">
        <Field label={question.label} error={error}>
          <Textarea
            className="min-h-24"
            placeholder={question.placeholder}
            {...register(fieldName)}
          />
        </Field>
      </div>
    );
  }

  return (
    <Field label={question.label} error={error}>
      <Input
        type={question.type === "number" ? "number" : question.type}
        min={question.type === "number" ? 0 : undefined}
        placeholder={question.placeholder}
        {...register(fieldName, {
          valueAsNumber: question.type === "number",
        })}
      />
    </Field>
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
      <FieldError message={error} />
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="text-sm font-medium text-destructive">{message}</p>;
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="max-w-[62%] text-right font-medium">{value}</span>
    </div>
  );
}
