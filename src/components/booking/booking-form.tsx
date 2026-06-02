"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CalendarDays,
  Check,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  Home,
  Loader2,
  MapPin,
  Phone,
  Plus,
  Sparkles,
} from "lucide-react";
import { Controller, useForm, useWatch, type FieldErrors } from "react-hook-form";

import { createBooking } from "@/app/actions";
import type { ServiceConfig, ServiceQuestion } from "@/config/services";
import {
  bookingWizardSchema,
  defaultBookingWizardValues,
  type BookingWizardValues,
} from "@/lib/booking-schema";
import { calculateEstimatedTotal, formatRand, getSelectedAddons } from "@/lib/pricing";
import type { CustomerAddress, PaymentType } from "@/lib/types";
import { useBookingWizardStore } from "@/stores/booking-wizard-store";
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

const steps = [
  "Select Service",
  "Service Details",
  "Add-ons",
  "Schedule",
  "Address Details",
  "Contact Details",
  "Review Booking",
  "Secure Payment",
];

const stepFields: Record<number, (keyof BookingWizardValues)[]> = {
  0: ["serviceSlug"],
  1: ["serviceData"],
  2: ["selectedAddons"],
  3: ["bookingDate", "bookingTime"],
  4: ["address", "suburb", "city"],
  5: ["customerName", "customerEmail", "customerPhone"],
  6: ["paymentType"],
  7: [],
};

type BookingFormProps = {
  services: ServiceConfig[];
  customer?: {
    fullName: string;
    email: string;
    phone: string;
  } | null;
  savedAddresses?: CustomerAddress[];
};

export function BookingForm({
  services,
  customer = null,
  savedAddresses = [],
}: BookingFormProps) {
  const storedStep = useBookingWizardStore((state) => state.currentStep);
  const storedValues = useBookingWizardStore((state) => state.values);
  const setStoredStep = useBookingWizardStore((state) => state.setCurrentStep);
  const setStoredValues = useBookingWizardStore((state) => state.setValues);
  const resetStore = useBookingWizardStore((state) => state.reset);
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<BookingWizardValues>({
    resolver: zodResolver(bookingWizardSchema),
    mode: "onTouched",
    defaultValues: {
      ...defaultBookingWizardValues,
      ...storedValues,
      serviceSlug: storedValues.serviceSlug || services[0]?.slug || "",
      customerName: storedValues.customerName || customer?.fullName || "",
      customerEmail: storedValues.customerEmail || customer?.email || "",
      customerPhone: storedValues.customerPhone || customer?.phone || "",
    },
  });

  const watchedValues = useWatch({ control: form.control });
  const watchedServiceData = Object.fromEntries(
    Object.entries(watchedValues.serviceData ?? {}).filter(
      ([, value]) => value !== undefined
    )
  ) as Record<string, string | number>;
  const watchedSelectedAddons = (watchedValues.selectedAddons ?? []).filter(
    (addonId): addonId is string => typeof addonId === "string"
  );
  const values: BookingWizardValues = {
    ...defaultBookingWizardValues,
    ...watchedValues,
    serviceData: watchedServiceData,
    selectedAddons: watchedSelectedAddons,
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
  const paymentSummary = getPaymentSummary(estimatedTotal, values.paymentType);

  useEffect(() => {
    if (!values.serviceSlug && services[0]) {
      form.setValue("serviceSlug", services[0].slug);
    }
  }, [form, services, values.serviceSlug]);

  function chooseService(service: ServiceConfig) {
    form.setValue("serviceSlug", service.slug, { shouldValidate: true });
    form.setValue("serviceData", {}, { shouldValidate: true });
    form.setValue("selectedAddons", [], { shouldValidate: true });
    setStoredValues({
      serviceSlug: service.slug,
      serviceData: {},
      selectedAddons: [],
    });
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

  async function goNext() {
    setSubmitError("");
    const valid = await form.trigger(stepFields[storedStep]);

    if (!valid) {
      return;
    }

    setStoredValues(form.getValues());
    setStoredStep(Math.min(storedStep + 1, steps.length - 1));
  }

  function goBack() {
    setSubmitError("");
    setStoredValues(form.getValues());
    setStoredStep(Math.max(storedStep - 1, 0));
  }

  function submitBooking() {
    setSubmitError("");
    const payload = form.getValues();
    setIsSubmitting(true);

    startTransition(async () => {
      try {
        const result = await createBooking(payload);
        resetStore();
        window.location.assign(result.authorizationUrl);
      } catch (error) {
        setIsSubmitting(false);
        setSubmitError(
          error instanceof Error
            ? error.message
            : "Unable to submit the booking right now."
        );
      }
    });
  }

  return (
    <form
      onSubmit={form.handleSubmit(submitBooking)}
      className="grid gap-5 lg:grid-cols-[1fr_360px]"
    >
      <div className="grid gap-5 pb-24 lg:pb-0">
        <ProgressIndicator currentStep={storedStep} />

        {storedStep === 0 ? (
          <StepCard icon={Sparkles} title="Select Service">
            <div className="grid gap-3 sm:grid-cols-2">
              {services.map((service) => {
                const selected = service.slug === values.serviceSlug;

                return (
                  <button
                    key={service.slug}
                    type="button"
                    onClick={() => chooseService(service)}
                    className={cn(
                      "grid min-h-44 gap-4 rounded-lg border bg-card p-4 text-left transition hover:border-primary/60",
                      selected && "border-primary bg-primary/5 ring-2 ring-primary/20"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold">{service.name}</h3>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                          {service.shortDescription}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "grid size-7 shrink-0 place-items-center rounded-full border",
                          selected && "border-primary bg-primary text-primary-foreground"
                        )}
                      >
                        {selected ? <Check className="size-4" /> : <Plus className="size-4" />}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {Math.round(service.durationMinutes / 60)} hr estimate
                      </span>
                      <span className="font-semibold">{formatRand(service.basePrice)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
            <FieldError message={form.formState.errors.serviceSlug?.message} />
          </StepCard>
        ) : null}

        {storedStep === 1 && selectedService ? (
          <StepCard icon={Home} title="Service Details">
            <div className="grid gap-4 sm:grid-cols-2">
              {selectedService.questions.map((question) => (
                <QuestionField
                  key={question.id}
                  question={question}
                  control={form.control}
                  register={form.register}
                  errors={form.formState.errors}
                />
              ))}
            </div>
          </StepCard>
        ) : null}

        {storedStep === 2 && selectedService ? (
          <StepCard icon={Plus} title="Add-ons">
            <div className="grid gap-3 sm:grid-cols-2">
              {selectedService.addons.map((addon) => {
                const checked = values.selectedAddons.includes(addon.id);

                return (
                  <label
                    key={addon.id}
                    className={cn(
                      "flex min-h-24 cursor-pointer items-start gap-3 rounded-lg border bg-card p-4 transition hover:border-primary/60",
                      checked && "border-primary bg-primary/5 ring-2 ring-primary/20"
                    )}
                  >
                    <input
                      type="checkbox"
                      className="mt-1 size-4 accent-primary"
                      checked={checked}
                      onChange={() => {
                        const current = form.getValues("selectedAddons");
                        const next = checked
                          ? current.filter((id) => id !== addon.id)
                          : [...current, addon.id];
                        form.setValue("selectedAddons", next, {
                          shouldDirty: true,
                          shouldValidate: true,
                        });
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
            </div>
          </StepCard>
        ) : null}

        {storedStep === 3 ? (
          <StepCard icon={CalendarDays} title="Schedule">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Booking date" error={form.formState.errors.bookingDate?.message}>
                <Input type="date" {...form.register("bookingDate")} />
              </Field>
              <Field label="Booking time" error={form.formState.errors.bookingTime?.message}>
                <Input type="time" {...form.register("bookingTime")} />
              </Field>
            </div>
          </StepCard>
        ) : null}

        {storedStep === 4 ? (
          <StepCard icon={MapPin} title="Address Details">
            <div className="grid gap-4">
              {customer && savedAddresses.length ? (
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
                            "grid min-h-28 gap-2 rounded-lg border bg-card p-4 text-left transition hover:border-primary/60",
                            selected &&
                              "border-primary bg-primary/5 ring-2 ring-primary/20"
                          )}
                        >
                          <span className="flex items-center justify-between gap-3">
                            <span className="font-medium">{address.label}</span>
                            {address.is_default ? (
                              <span className="text-xs text-primary">Default</span>
                            ) : null}
                          </span>
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
                <Input autoComplete="street-address" {...form.register("address")} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Suburb" error={form.formState.errors.suburb?.message}>
                  <Input {...form.register("suburb")} />
                </Field>
                <Field label="City" error={form.formState.errors.city?.message}>
                  <Input {...form.register("city")} />
                </Field>
              </div>
              {customer ? (
                <>
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
                  {values.saveAddress && !values.selectedAddressId ? (
                    <Field label="Address label">
                      <Input
                        placeholder="Home, Office, Airbnb"
                        {...form.register("addressLabel")}
                      />
                    </Field>
                  ) : null}
                </>
              ) : null}
            </div>
          </StepCard>
        ) : null}

        {storedStep === 5 ? (
          <StepCard icon={Phone} title="Contact Details">
            <div className="grid gap-4">
              <Field label="Customer name" error={form.formState.errors.customerName?.message}>
                <Input autoComplete="name" {...form.register("customerName")} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Customer email" error={form.formState.errors.customerEmail?.message}>
                  <Input type="email" autoComplete="email" {...form.register("customerEmail")} />
                </Field>
                <Field label="Customer phone" error={form.formState.errors.customerPhone?.message}>
                  <Input type="tel" autoComplete="tel" {...form.register("customerPhone")} />
                </Field>
              </div>
              <Field label="Notes" error={form.formState.errors.notes?.message}>
                <Textarea
                  className="min-h-28"
                  placeholder="Access instructions, parking details, or anything we should know."
                  {...form.register("notes")}
                />
              </Field>
            </div>
          </StepCard>
        ) : null}

        {storedStep === 6 && selectedService ? (
          <StepCard icon={ClipboardList} title="Review Booking">
            <BookingReview
              values={values}
              service={selectedService}
              selectedAddons={selectedAddons}
              estimatedTotal={estimatedTotal}
            />
            <PaymentSelection
              paymentType={values.paymentType}
              estimatedTotal={estimatedTotal}
              onChange={(paymentType) =>
                form.setValue("paymentType", paymentType, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
            />
            <FieldError message={form.formState.errors.paymentType?.message} />
          </StepCard>
        ) : null}

        {storedStep === 7 && selectedService ? (
          <StepCard icon={CheckCircle2} title="Secure Payment">
            <div className="grid gap-5">
              <div className="rounded-lg border bg-primary/5 p-4">
                <p className="font-medium">Ready for Shalean to confirm</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Continue to secure payment. The booking will be saved as
                  Pending Payment and confirmed after Paystack verifies the
                  transaction.
                </p>
              </div>
              <BookingReview
                values={values}
                service={selectedService}
                selectedAddons={selectedAddons}
                estimatedTotal={estimatedTotal}
                compact
              />
              <PaymentBreakdown
                paymentType={values.paymentType}
                estimatedTotal={estimatedTotal}
              />
              {submitError ? <FieldError message={submitError} /> : null}
            </div>
          </StepCard>
        ) : null}

        <WizardControls
          currentStep={storedStep}
          isSubmitting={isSubmitting}
          onBack={goBack}
          onNext={goNext}
        />
      </div>

      <aside className="lg:sticky lg:top-6 lg:h-fit">
        <Card className="rounded-lg border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle>Booking estimate</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Selected service</p>
              <p className="mt-1 font-medium">
                {selectedService?.name ?? "Choose a service"}
              </p>
            </div>
            <Separator />
            <div>
              <p className="text-sm text-muted-foreground">Base price</p>
              <p className="mt-1 font-medium">
                {selectedService ? formatRand(selectedService.basePrice) : formatRand(0)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Add-ons</p>
              <p className="mt-1 font-medium">
                {selectedAddons.length
                  ? selectedAddons.map((addon) => addon.label).join(", ")
                  : "None selected"}
              </p>
            </div>
            <Separator />
            <div>
              <p className="text-sm text-muted-foreground">Estimated total</p>
              <p className="mt-1 text-3xl font-semibold tracking-normal">
                {formatRand(estimatedTotal)}
              </p>
            </div>
            <div className="rounded-lg border bg-background p-3">
              <p className="text-sm text-muted-foreground">Selected payment</p>
              <p className="mt-1 font-medium">{values.paymentType}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Pay now: {formatRand(paymentSummary.amountDue)}
              </p>
              {paymentSummary.balanceDue > 0 ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  Balance later: {formatRand(paymentSummary.balanceDue)}
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </aside>
    </form>
  );
}

function ProgressIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-3 flex items-center justify-between text-sm">
        <span className="font-medium">{steps[currentStep]}</span>
        <span className="text-muted-foreground">
          Step {currentStep + 1} of {steps.length}
        </span>
      </div>
      <div className="grid grid-cols-8 gap-1">
        {steps.map((step, index) => (
          <div
            key={step}
            className={cn(
              "h-2 rounded-full bg-muted",
              index <= currentStep && "bg-primary"
            )}
          />
        ))}
      </div>
    </div>
  );
}

function StepCard({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Sparkles;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="rounded-lg">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Icon className="size-5 text-primary" />
          <CardTitle>{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function QuestionField({
  question,
  control,
  register,
  errors,
}: {
  question: ServiceQuestion;
  control: ReturnType<typeof useForm<BookingWizardValues>>["control"];
  register: ReturnType<typeof useForm<BookingWizardValues>>["register"];
  errors: FieldErrors<BookingWizardValues>;
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
              <SelectTrigger className="h-11 w-full">
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
            className="min-h-28"
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

function PaymentSelection({
  paymentType,
  estimatedTotal,
  onChange,
}: {
  paymentType: PaymentType;
  estimatedTotal: number;
  onChange: (paymentType: PaymentType) => void;
}) {
  const deposit = getPaymentSummary(estimatedTotal, "Deposit");
  const full = getPaymentSummary(estimatedTotal, "Full Payment");

  return (
    <div className="grid gap-3 rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2">
        <CreditCard className="size-4 text-primary" />
        <p className="font-medium">Payment option</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <PaymentOption
          checked={paymentType === "Deposit"}
          title="Pay Deposit"
          description={`Pay ${formatRand(deposit.amountDue)} now`}
          meta={`Balance due after deposit: ${formatRand(deposit.balanceDue)}`}
          onClick={() => onChange("Deposit")}
        />
        <PaymentOption
          checked={paymentType === "Full Payment"}
          title="Pay Full Amount"
          description={`Pay ${formatRand(full.amountDue)} now`}
          meta="No balance due after payment"
          onClick={() => onChange("Full Payment")}
        />
      </div>
      <PaymentBreakdown
        paymentType={paymentType}
        estimatedTotal={estimatedTotal}
      />
    </div>
  );
}

function PaymentOption({
  checked,
  title,
  description,
  meta,
  onClick,
}: {
  checked: boolean;
  title: string;
  description: string;
  meta: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "grid min-h-28 gap-2 rounded-lg border bg-background p-4 text-left transition hover:border-primary/60",
        checked && "border-primary bg-primary/5 ring-2 ring-primary/20"
      )}
    >
      <span className="flex items-center justify-between gap-3">
        <span className="font-medium">{title}</span>
        <span
          className={cn(
            "grid size-6 place-items-center rounded-full border",
            checked && "border-primary bg-primary text-primary-foreground"
          )}
        >
          {checked ? <Check className="size-3.5" /> : null}
        </span>
      </span>
      <span className="text-sm text-muted-foreground">{description}</span>
      <span className="text-xs text-muted-foreground">{meta}</span>
    </button>
  );
}

function PaymentBreakdown({
  paymentType,
  estimatedTotal,
}: {
  paymentType: PaymentType;
  estimatedTotal: number;
}) {
  const summary = getPaymentSummary(estimatedTotal, paymentType);

  return (
    <ReviewSection
      title="Payment"
      items={[
        ["Payment option", paymentType],
        ["Estimated total", formatRand(summary.estimatedTotal)],
        [
          "Deposit amount",
          formatRand(getPaymentSummary(estimatedTotal, "Deposit").amountDue),
        ],
        ["Full payment amount", formatRand(estimatedTotal)],
        ["Amount due now", formatRand(summary.amountDue)],
        ["Balance due after payment", formatRand(summary.balanceDue)],
      ]}
    />
  );
}

function BookingReview({
  values,
  service,
  selectedAddons,
  estimatedTotal,
  compact = false,
}: {
  values: BookingWizardValues;
  service: ServiceConfig;
  selectedAddons: ReturnType<typeof getSelectedAddons>;
  estimatedTotal: number;
  compact?: boolean;
}) {
  return (
    <div className="grid gap-4">
      <ReviewSection
        title="Service"
        items={[
          ["Service type", service.name],
          ["Estimated total", formatRand(estimatedTotal)],
        ]}
      />
      {!compact ? (
        <ReviewSection
          title="Details"
          items={service.questions.map((question) => [
            question.label,
            String(values.serviceData[question.id] ?? ""),
          ])}
        />
      ) : null}
      <ReviewSection
        title="Add-ons"
        items={
          selectedAddons.length
            ? selectedAddons.map((addon) => [addon.label, formatRand(addon.price)])
            : [["Selected add-ons", "None"]]
        }
      />
      {!compact ? (
        <>
          <ReviewSection
            title="Schedule"
            items={[
              ["Date", values.bookingDate],
              ["Time", values.bookingTime],
            ]}
          />
          <ReviewSection
            title="Address and contact"
            items={[
              ["Address", `${values.address}, ${values.suburb}, ${values.city}`],
              ["Customer", values.customerName],
              ["Email", values.customerEmail],
              ["Phone", values.customerPhone],
            ]}
          />
        </>
      ) : null}
    </div>
  );
}

function ReviewSection({
  title,
  items,
}: {
  title: string;
  items: [string, string][];
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="font-medium">{title}</p>
      <dl className="mt-3 grid gap-2 text-sm">
        {items.map(([label, value]) => (
          <div key={`${title}-${label}`} className="flex justify-between gap-4">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="max-w-[60%] text-right font-medium">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function getPaymentSummary(estimatedTotal: number, paymentType: PaymentType) {
  const normalizedTotal = Math.round(estimatedTotal * 100) / 100;
  const amountDue =
    paymentType === "Deposit"
      ? Math.round(normalizedTotal * 50) / 100
      : normalizedTotal;

  return {
    estimatedTotal: normalizedTotal,
    amountDue,
    balanceDue: Math.max(
      0,
      Math.round((normalizedTotal - amountDue) * 100) / 100
    ),
  };
}

function WizardControls({
  currentStep,
  isSubmitting,
  onBack,
  onNext,
}: {
  currentStep: number;
  isSubmitting: boolean;
  onBack: () => void;
  onNext: () => void;
}) {
  const atEnd = currentStep === steps.length - 1;

  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 p-4 backdrop-blur lg:static lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
      <div className="mx-auto flex max-w-6xl gap-3 lg:justify-between">
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="h-11 flex-1 lg:flex-none"
          disabled={currentStep === 0 || isSubmitting}
          onClick={onBack}
        >
          Back
        </Button>
        {atEnd ? (
          <Button
            type="submit"
            size="lg"
            className="h-11 flex-1 lg:flex-none"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin" />
                Saving
              </>
            ) : (
              "Continue to Payment"
            )}
          </Button>
        ) : (
          <Button
            type="button"
            size="lg"
            className="h-11 flex-1 lg:flex-none"
            onClick={onNext}
          >
            Next
          </Button>
        )}
      </div>
    </div>
  );
}
