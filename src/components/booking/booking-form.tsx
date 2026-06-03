"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BrushCleaning,
  Building2,
  Bubbles,
  CalendarCheck,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  CreditCard,
  Home,
  KeyRound,
  ListChecks,
  Loader2,
  MapPin,
  Minus,
  PackageOpen,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  UserCheck,
  Users,
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
import {
  formatPreferredDays,
  normalizeRecurringFrequency,
  recurringDays,
  weekdayNameFromDate,
} from "@/lib/recurring-schedule";
import type { Cleaner, CustomerAddress, PaymentType } from "@/lib/types";
import { useBookingWizardStore } from "@/stores/booking-wizard-store";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const steps = [
  { slug: "service-selection", label: "Service" },
  { slug: "service-details", label: "Details" },
  { slug: "cleaner-schedule", label: "Schedule" },
  { slug: "address-contact", label: "Address" },
  { slug: "review-payment", label: "Checkout" },
];

const stepFields: Record<number, (keyof BookingWizardValues)[]> = {
  0: ["serviceSlug"],
  1: ["serviceData", "selectedAddons", "recurringPreferredDays"],
  2: [
    "numberOfCleaners",
    "cleanerSelectionType",
    "preferredCleanerId",
    "bookingDate",
    "bookingTime",
  ],
  3: [
    "address",
    "suburb",
    "city",
    "customerName",
    "customerEmail",
    "customerPhone",
  ],
  4: ["paymentType"],
};

const choiceCardClass =
  "rounded-lg border border-border/80 bg-card text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/20";
const choiceCardSelectedClass =
  "border-primary bg-primary/5 shadow-md ring-2 ring-primary/20";
const fieldControlClass =
  "h-11 rounded-lg bg-card px-3 shadow-sm focus-visible:border-primary/70 focus-visible:ring-primary/20";
const textareaControlClass =
  "min-h-28 rounded-lg bg-card px-3 py-3 shadow-sm focus-visible:border-primary/70 focus-visible:ring-primary/20";

const serviceIconMap = {
  "regular-cleaning": Home,
  "airbnb-cleaning": KeyRound,
  "office-cleaning": Building2,
  "carpet-cleaning": BrushCleaning,
  "moving-cleaning": PackageOpen,
  "deep-cleaning": Bubbles,
};

const trustBadges = [
  { label: "Vetted & trusted cleaners", icon: ShieldCheck },
  { label: "Flexible scheduling", icon: CalendarCheck },
  { label: "Secure payments", icon: CreditCard },
  { label: "Satisfaction guarantee", icon: BadgeCheck },
];

const timeOptions = Array.from({ length: 33 }, (_, index) => {
  const totalMinutes = 6 * 60 + index * 30;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
});

const suburbOptions = [
  "Amanzimtoti",
  "Arcadia",
  "Ballito",
  "Bedfordview",
  "Bellville",
  "Benoni",
  "Bryanston",
  "Centurion",
  "Claremont",
  "Constantia",
  "Durban North",
  "Edenvale",
  "Fourways",
  "Garsfontein",
  "Goodwood",
  "Green Point",
  "Hatfield",
  "Hillcrest",
  "Kempton Park",
  "Kloof",
  "Lonehill",
  "Menlyn",
  "Midrand",
  "Milnerton",
  "Morningside",
  "Newlands",
  "Northcliff",
  "Parkhurst",
  "Pinelands",
  "Randburg",
  "Rosebank",
  "Rondebosch",
  "Sandton",
  "Sea Point",
  "Somerset West",
  "Sunninghill",
  "Table View",
  "Umhlanga",
  "Waterkloof",
  "Westville",
  "Woodstock",
];

type BookingFormProps = {
  services: ServiceConfig[];
  cleaners?: Cleaner[];
  customer?: {
    fullName: string;
    email: string;
    phone: string;
  } | null;
  savedAddresses?: CustomerAddress[];
  initialServiceSlug?: string;
  initialStepSlug?: string;
  customerName?: string | null;
  loggedIn?: boolean;
};

export function BookingForm({
  services,
  cleaners = [],
  customer = null,
  savedAddresses = [],
  initialServiceSlug,
  initialStepSlug,
  customerName = null,
  loggedIn = false,
}: BookingFormProps) {
  const storedStep = useBookingWizardStore((state) => state.currentStep);
  const storedValues = useBookingWizardStore((state) => state.values);
  const setStoredStep = useBookingWizardStore((state) => state.setCurrentStep);
  const setStoredValues = useBookingWizardStore((state) => state.setValues);
  const resetStore = useBookingWizardStore((state) => state.reset);
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mobileEstimateOpen, setMobileEstimateOpen] = useState(false);
  const initialStepIndex = getInitialStepIndex(initialStepSlug, storedStep);
  const [currentStep, setCurrentStep] = useState(initialStepIndex);
  const initialServiceValue = getInitialServiceSlug(
    services,
    storedValues.serviceSlug,
    initialServiceSlug
  );
  const showEstimate = currentStep > 0;

  const form = useForm<BookingWizardValues>({
    resolver: zodResolver(bookingWizardSchema),
    mode: "onTouched",
    defaultValues: {
      ...defaultBookingWizardValues,
      ...storedValues,
      serviceSlug: initialServiceValue,
      cleanerSelectionType: storedValues.cleanerSelectionType || "auto",
      customerName: storedValues.customerName || customer?.fullName || "",
      customerEmail: storedValues.customerEmail || customer?.email || "",
      customerPhone: storedValues.customerPhone || customer?.phone || "",
      paymentType: "Full Payment",
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
  const watchedRecurringPreferredDays = (
    watchedValues.recurringPreferredDays ?? ["Monday"]
  ).filter((day): day is BookingWizardValues["recurringPreferredDays"][number] =>
    recurringDays.includes(day as BookingWizardValues["recurringPreferredDays"][number])
  );
  const values: BookingWizardValues = {
    ...defaultBookingWizardValues,
    ...watchedValues,
    serviceData: watchedServiceData,
    selectedAddons: watchedSelectedAddons,
    recurringPreferredDays: watchedRecurringPreferredDays,
    numberOfCleaners: Number(watchedValues.numberOfCleaners ?? 1),
    cleanerSelectionType: watchedValues.cleanerSelectionType ?? "auto",
  };
  const selectedService = useMemo(
    () => services.find((service) => service.slug === values.serviceSlug),
    [services, values.serviceSlug]
  );
  const activeCleaners = useMemo(
    () => cleaners.filter((cleaner) => cleaner.active),
    [cleaners]
  );
  const matchingCleaners = useMemo(() => {
    if (!selectedService) {
      return activeCleaners;
    }

    const serviceMatches = activeCleaners.filter((cleaner) =>
      cleaner.specialties.some((specialty) => specialty === selectedService.name)
    );

    return serviceMatches.length ? serviceMatches : activeCleaners;
  }, [activeCleaners, selectedService]);
  const selectedCleaner = matchingCleaners.find(
    (cleaner) => cleaner.id === values.preferredCleanerId
  );
  const customerCanChooseCleaners = selectedService
    ? canCustomerChooseCleaners(selectedService.name)
    : true;
  const selectedAddons = selectedService
    ? getSelectedAddons(selectedService, values.selectedAddons)
    : [];
  const estimatedTotal = selectedService
    ? calculateEstimatedTotal(
        selectedService,
        values.selectedAddons,
        values.serviceData
      )
    : 0;
  const paymentSummary = getPaymentSummary(estimatedTotal, values.paymentType);
  const recurringFrequency = normalizeRecurringFrequency(
    values.serviceData.cleaning_frequency
  );
  const isRecurring = Boolean(recurringFrequency);
  const recurringDayLabel =
    recurringFrequency === "Weekly"
      ? formatPreferredDays(values.recurringPreferredDays)
      : values.bookingDate
        ? weekdayNameFromDate(values.bookingDate)
        : "Selected date";
  const heroCopy = getStepHeroCopy(currentStep, selectedService, isRecurring);
  const preferredCleanerMissing =
    values.cleanerSelectionType === "preferred" &&
    Boolean(values.preferredCleanerId) &&
    !selectedCleaner;

  useEffect(() => {
    if (!values.serviceSlug && services[0]) {
      form.setValue("serviceSlug", services[0].slug);
    }
  }, [form, services, values.serviceSlug]);

  useEffect(() => {
    if (!selectedService) {
      return;
    }

    const defaults = getDefaultServiceData(selectedService);
    if (!Object.keys(defaults).length) {
      return;
    }

    const current = form.getValues("serviceData");
    const next = { ...current };
    let changed = false;

    for (const [key, value] of Object.entries(defaults)) {
      if (next[key] === undefined || next[key] === "") {
        next[key] = value;
        changed = true;
      }
    }

    if (changed) {
      form.setValue("serviceData", next, { shouldValidate: false });
    }
  }, [form, selectedService]);

  useEffect(() => {
    if (!values.serviceSlug || typeof window === "undefined") {
      return;
    }

    const url = new URL(window.location.href);
    const stepSlug = steps[currentStep]?.slug ?? steps[0].slug;

    url.searchParams.set("service", values.serviceSlug);
    url.searchParams.set("step", stepSlug);

    const nextUrl = `${url.pathname}?${url.searchParams.toString()}${url.hash}`;
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;

    if (nextUrl !== currentUrl) {
      window.history.replaceState(null, "", nextUrl);
    }
  }, [currentStep, values.serviceSlug]);

  useEffect(() => {
    if (!customerCanChooseCleaners) {
      form.setValue("numberOfCleaners", 1, { shouldValidate: false });
      form.setValue("cleanerSelectionType", "auto", { shouldValidate: false });
      form.setValue("preferredCleanerId", "", { shouldValidate: false });
      form.setValue("preferredCleanerName", "", { shouldValidate: false });
      return;
    }

    if (values.cleanerSelectionType === "auto") {
      form.setValue("preferredCleanerId", "", { shouldValidate: false });
      form.setValue("preferredCleanerName", "", { shouldValidate: false });
    }
  }, [customerCanChooseCleaners, form, values.cleanerSelectionType]);

  useEffect(() => {
    if (values.paymentType !== "Full Payment") {
      form.setValue("paymentType", "Full Payment", {
        shouldDirty: true,
        shouldValidate: false,
      });
    }
  }, [form, values.paymentType]);

  function chooseService(service: ServiceConfig) {
    const serviceData = getDefaultServiceData(service);

    form.setValue("serviceSlug", service.slug, { shouldValidate: true });
    form.setValue("serviceData", serviceData, { shouldValidate: true });
    form.setValue("selectedAddons", [], { shouldValidate: true });
    form.setValue("recurringPreferredDays", ["Monday"], {
      shouldValidate: true,
    });
    form.setValue("numberOfCleaners", 1, { shouldValidate: true });
    form.setValue("cleanerSelectionType", "auto", { shouldValidate: true });
    form.setValue("preferredCleanerId", "", { shouldValidate: true });
    form.setValue("preferredCleanerName", "", { shouldValidate: true });
    setStoredValues({
      serviceSlug: service.slug,
      serviceData,
      selectedAddons: [],
      recurringPreferredDays: ["Monday"],
      numberOfCleaners: 1,
      cleanerSelectionType: "auto",
      preferredCleanerId: "",
      preferredCleanerName: "",
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

  function chooseAutoAssign() {
    form.setValue("cleanerSelectionType", "auto", { shouldValidate: true });
    form.setValue("preferredCleanerId", "", { shouldValidate: true });
    form.setValue("preferredCleanerName", "", { shouldValidate: true });
  }

  function choosePreferredCleaner(cleaner: Cleaner) {
    form.setValue("cleanerSelectionType", "preferred", { shouldValidate: true });
    form.setValue("preferredCleanerId", cleaner.id, { shouldValidate: true });
    form.setValue("preferredCleanerName", cleaner.full_name, {
      shouldValidate: true,
    });
  }

  async function goNext() {
    setSubmitError("");
    const valid = await form.trigger(stepFields[currentStep]);

    if (!valid) {
      return;
    }

    setStoredValues(form.getValues());
    const nextStep = Math.min(currentStep + 1, steps.length - 1);
    setCurrentStep(nextStep);
    setStoredStep(nextStep);
  }

  function goBack() {
    setSubmitError("");
    setStoredValues(form.getValues());
    const previousStep = Math.max(currentStep - 1, 0);
    setCurrentStep(previousStep);
    setStoredStep(previousStep);
  }

  function submitBooking() {
    setSubmitError("");
    const payload = form.getValues();
    if (payload.cleanerSelectionType === "auto") {
      payload.preferredCleanerId = "";
      payload.preferredCleanerName = "";
    }
    if (selectedService && !canCustomerChooseCleaners(selectedService.name)) {
      payload.numberOfCleaners = 1;
      payload.cleanerSelectionType = "auto";
      payload.preferredCleanerId = "";
      payload.preferredCleanerName = "";
    }
    setIsSubmitting(true);

    startTransition(async () => {
      try {
        const result = await createBooking(payload);
        resetStore();
        window.location.assign(
          result.recurringPlanUrl || result.authorizationUrl
        );
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
    <>
      <BookingHeader
        currentStep={currentStep}
        customerName={customerName}
        loggedIn={loggedIn}
      />
      <section className="mx-auto grid w-full max-w-6xl gap-7 px-5 pb-8 pt-7 sm:px-8 sm:pb-10 sm:pt-9 lg:px-10 lg:pb-12">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-3xl font-bold leading-tight tracking-normal text-foreground sm:text-4xl lg:text-5xl">
            {heroCopy.title}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
            {heroCopy.description}
          </p>
        </div>
        <form
          onSubmit={form.handleSubmit(submitBooking)}
          className={cn(
            "grid items-start gap-6 lg:gap-8",
            showEstimate && "lg:grid-cols-[minmax(0,1fr)_360px]"
          )}
        >
      <div className="grid min-w-0 gap-6 pb-24 lg:pb-0">
        {showEstimate ? (
          <MobileEstimate
            open={mobileEstimateOpen}
            onToggle={() => setMobileEstimateOpen((open) => !open)}
            values={values}
            selectedService={selectedService}
            selectedAddons={selectedAddons}
            estimatedTotal={estimatedTotal}
            paymentSummary={paymentSummary}
          />
        ) : null}

        {currentStep === 0 ? (
          <section className="grid gap-5">
            <div className="grid gap-5">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {services.map((service) => {
                  const selected = service.slug === values.serviceSlug;
                  const Icon =
                    serviceIconMap[
                      service.slug as keyof typeof serviceIconMap
                    ] ?? Sparkles;

                  return (
                    <button
                      key={service.slug}
                      type="button"
                      onClick={() => chooseService(service)}
                      className={cn(
                        choiceCardClass,
                        "relative grid min-h-40 grid-rows-[auto_1fr_auto] gap-3 p-4 sm:min-h-52 sm:gap-5 sm:p-5",
                        selected &&
                          "border-primary bg-primary/5 shadow-[0_14px_34px_rgba(8,105,62,0.10)] ring-1 ring-primary/20"
                      )}
                    >
                      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 sm:gap-4">
                        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/10 sm:size-16">
                          <Icon className="size-6 sm:size-8" />
                        </span>
                        <h3 className="min-w-0 text-base font-bold leading-snug text-foreground sm:text-lg">
                          {service.name}
                        </h3>
                        <span
                          className={cn(
                            "grid size-8 shrink-0 place-items-center rounded-full border border-primary/20 bg-background text-primary transition",
                            selected &&
                              "border-primary bg-primary text-primary-foreground shadow-sm"
                          )}
                        >
                          {selected ? <Check className="size-4" /> : <Plus className="size-4" />}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm leading-5 text-muted-foreground sm:leading-6">
                          {service.shortDescription}
                        </p>
                      </div>
                      <div className="flex items-end justify-between gap-3">
                        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-sm font-semibold text-primary">
                          {Math.round(service.durationMinutes / 60)} hr estimate
                        </span>
                        <span className="text-xl font-bold tracking-normal text-foreground">
                          {formatRand(service.basePrice)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
              <FieldError message={form.formState.errors.serviceSlug?.message} />
              <TrustBadges />
            </div>
          </section>
        ) : null}

        {currentStep === 1 && selectedService ? (
          <StepCard icon={ListChecks} title="Service Details" variant="plain">
            <div className="grid gap-5">
              <GroupedPanel title={selectedService.name}>
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
                {recurringFrequency === "Weekly" ? (
                  <div className="mt-4">
                    <Field
                      label="Weekly days"
                      error={form.formState.errors.recurringPreferredDays?.message}
                    >
                      <PreferredDaysField
                        value={values.recurringPreferredDays}
                        onChange={(recurringPreferredDays) =>
                          form.setValue(
                            "recurringPreferredDays",
                            recurringPreferredDays,
                            {
                              shouldDirty: true,
                              shouldValidate: true,
                            }
                          )
                        }
                      />
                    </Field>
                  </div>
                ) : null}
              </GroupedPanel>
              <GroupedPanel title="Add-ons">
                <div className="grid gap-3 sm:grid-cols-2">
                  {selectedService.addons
                    .filter((addon) => addon.active !== false)
                    .map((addon) => {
                    const checked = values.selectedAddons.includes(addon.id);

                    return (
                      <label
                        key={addon.id}
                        className={cn(
                          choiceCardClass,
                          "flex min-h-24 cursor-pointer items-start justify-between gap-4 p-4",
                          checked && choiceCardSelectedClass
                        )}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
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
                          <span className="font-semibold leading-snug">{addon.label}</span>
                          <span className="text-sm font-medium text-muted-foreground">
                            {formatRand(addon.price)}
                          </span>
                        </span>
                        <span
                          aria-hidden="true"
                          className={cn(
                            "relative mt-0.5 h-7 w-12 shrink-0 rounded-full border border-border bg-muted transition",
                            checked && "border-primary bg-primary"
                          )}
                        >
                          <span
                            className={cn(
                              "absolute left-1 top-1 size-5 rounded-full bg-background shadow-sm transition",
                              checked && "translate-x-5"
                            )}
                          />
                        </span>
                      </label>
                    );
                  })}
                </div>
                <FieldError message={form.formState.errors.selectedAddons?.message} />
              </GroupedPanel>
            </div>
          </StepCard>
        ) : null}

        {currentStep === 2 ? (
          <StepCard icon={UserCheck} title="Cleaner & Schedule" variant="plain">
            <div className="grid gap-5">
              <GroupedPanel title="Cleaner preference">
                {customerCanChooseCleaners ? (
                  <div className="grid gap-5">
                    <Field
                      label="Number of cleaners"
                      error={form.formState.errors.numberOfCleaners?.message}
                    >
                      <Controller
                        control={form.control}
                        name="numberOfCleaners"
                        render={({ field }) => (
                          <div className="max-w-64">
                            <NumberStepper
                              value={Number(field.value ?? 1)}
                              min={1}
                              max={5}
                              onChange={field.onChange}
                            />
                          </div>
                        )}
                      />
                    </Field>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <CleanerModeCard
                        checked={values.cleanerSelectionType === "auto"}
                        title="Auto-assign best available cleaner"
                        description="Shalean will match this booking with the best available cleaner."
                        onClick={chooseAutoAssign}
                      />
                      <CleanerModeCard
                        checked={values.cleanerSelectionType === "preferred"}
                        title="Select a preferred cleaner"
                        description="Choose a cleaner preference for the operations team to review."
                        onClick={() =>
                          form.setValue("cleanerSelectionType", "preferred", {
                            shouldValidate: true,
                          })
                        }
                      />
                    </div>

                    {values.cleanerSelectionType === "preferred" ? (
                      <div className="mt-4 grid gap-3">
                        {matchingCleaners.length ? (
                          <div className="grid gap-3 md:grid-cols-2">
                            {matchingCleaners.map((cleaner) => (
                              <CleanerCard
                                key={cleaner.id}
                                cleaner={cleaner}
                                selected={cleaner.id === values.preferredCleanerId}
                                hasSchedule={Boolean(values.bookingDate && values.bookingTime)}
                                onSelect={() => choosePreferredCleaner(cleaner)}
                              />
                            ))}
                          </div>
                        ) : (
                          <p className="rounded-lg border border-dashed bg-background p-4 text-sm text-muted-foreground">
                            No active cleaners are available to show yet. You can still use auto-assign.
                          </p>
                        )}
                        {preferredCleanerMissing ? (
                          <FieldError message="The preferred cleaner does not match the current service. Choose another cleaner or use auto-assign." />
                        ) : null}
                        <FieldError message={form.formState.errors.preferredCleanerId?.message} />
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <p className="rounded-lg border border-dashed bg-background p-4 text-sm leading-6 text-muted-foreground">
                    The operations team will build and assign the cleaning team after checkout.
                  </p>
                )}
              </GroupedPanel>

              <GroupedPanel title="Schedule">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label={isRecurring ? "Start date" : "Booking date"}
                    error={form.formState.errors.bookingDate?.message}
                  >
                    <Controller
                      control={form.control}
                      name="bookingDate"
                      render={({ field }) => (
                        <DatePickerField
                          value={field.value}
                          onChange={field.onChange}
                        />
                      )}
                    />
                  </Field>
                  <Field
                    label={isRecurring ? "Preferred time" : "Booking time"}
                    error={form.formState.errors.bookingTime?.message}
                  >
                    <Controller
                      control={form.control}
                      name="bookingTime"
                      render={({ field }) => (
                        <TimePickerField
                          value={field.value}
                          onChange={field.onChange}
                        />
                      )}
                    />
                  </Field>
                </div>
                {values.cleanerSelectionType === "preferred" && selectedCleaner ? (
                  <p className="mt-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm leading-6 text-muted-foreground">
                    {selectedCleaner.full_name} is your preferred cleaner. Final assignment is confirmed after the team checks live availability.
                  </p>
                ) : null}
              </GroupedPanel>
            </div>
          </StepCard>
        ) : null}

        {currentStep === 3 ? (
          <StepCard icon={MapPin} title="Address & Contact" variant="plain">
            <div className="grid gap-5">
              <GroupedPanel title="Address" variant="plain">
                <div className="grid gap-4">
                  {customer && savedAddresses.length ? (
                    <div className="grid gap-3">
                      <Label className="text-sm font-semibold">Saved addresses</Label>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {savedAddresses.map((address) => {
                          const selected = values.selectedAddressId === address.id;

                          return (
                            <button
                              key={address.id}
                              type="button"
                              onClick={() => chooseSavedAddress(address)}
                              className={cn(
                                choiceCardClass,
                                "grid min-h-28 gap-3 p-4",
                                selected && choiceCardSelectedClass
                              )}
                            >
                              <span className="flex items-center justify-between gap-3">
                                <span className="font-semibold">{address.label}</span>
                                {address.is_default ? (
                                  <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                                    Default
                                  </span>
                                ) : null}
                              </span>
                              <span className="text-sm leading-6 text-muted-foreground">
                                {address.address}, {address.suburb}, {address.city}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  <Field label="Street address" error={form.formState.errors.address?.message}>
                    <Input
                      autoComplete="street-address"
                      className={fieldControlClass}
                      {...form.register("address")}
                    />
                  </Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Suburb" error={form.formState.errors.suburb?.message}>
                      <Controller
                        control={form.control}
                        name="suburb"
                        render={({ field }) => (
                          <SuburbSearchField
                            value={field.value}
                            onChange={field.onChange}
                          />
                        )}
                      />
                    </Field>
                    <Field label="City" error={form.formState.errors.city?.message}>
                      <Input className={fieldControlClass} {...form.register("city")} />
                    </Field>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Field label="Access instructions">
                      <Input
                        className={fieldControlClass}
                        {...form.register("accessInstructions")}
                      />
                    </Field>
                    <Field label="Gate code">
                      <Input className={fieldControlClass} {...form.register("gateCode")} />
                    </Field>
                    <Field label="Parking instructions">
                      <Input
                        className={fieldControlClass}
                        {...form.register("parkingInstructions")}
                      />
                    </Field>
                  </div>
                  {customer ? (
                    <>
                      <label className="flex min-h-12 items-center gap-3 rounded-lg border border-border/80 bg-card px-4 py-3 text-sm font-medium shadow-sm">
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
                            className={fieldControlClass}
                            {...form.register("addressLabel")}
                          />
                        </Field>
                      ) : null}
                    </>
                  ) : null}
                </div>
              </GroupedPanel>

              <GroupedPanel title="Contact" variant="plain">
                <div className="grid gap-4">
                  <Field label="Customer name" error={form.formState.errors.customerName?.message}>
                    <Input
                      autoComplete="name"
                      className={fieldControlClass}
                      {...form.register("customerName")}
                    />
                  </Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Customer email" error={form.formState.errors.customerEmail?.message}>
                      <Input
                        type="email"
                        autoComplete="email"
                        className={fieldControlClass}
                        {...form.register("customerEmail")}
                      />
                    </Field>
                    <Field label="Customer phone" error={form.formState.errors.customerPhone?.message}>
                      <Input
                        type="tel"
                        autoComplete="tel"
                        className={fieldControlClass}
                        {...form.register("customerPhone")}
                      />
                    </Field>
                  </div>
                  <Field label="Notes" error={form.formState.errors.notes?.message}>
                    <Textarea
                      className={textareaControlClass}
                      placeholder="Access instructions, parking details, or anything we should know."
                      {...form.register("notes")}
                    />
                  </Field>
                </div>
              </GroupedPanel>
            </div>
          </StepCard>
        ) : null}

        {currentStep === 4 && selectedService ? (
          <StepCard icon={CreditCard} title="Review & Payment">
            <div className="grid gap-5">
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-5 shadow-sm">
                <p className="font-semibold">
                  {isRecurring
                    ? "Ready for secure recurring payment"
                    : "Ready for secure payment"}
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {isRecurring
                    ? "The first booking will be saved as Pending Payment, then the recurring plan starts after Paystack verifies the transaction."
                    : "The booking will be saved as Pending Payment and confirmed after Paystack verifies the transaction."}
                </p>
              </div>
              <BookingReview
                values={values}
                service={selectedService}
                selectedAddons={selectedAddons}
                estimatedTotal={estimatedTotal}
                recurringFrequency={recurringFrequency}
                recurringDayLabel={recurringDayLabel}
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
              {submitError ? <FieldError message={submitError} /> : null}
            </div>
          </StepCard>
        ) : null}

        <WizardControls
          currentStep={currentStep}
          isSubmitting={isSubmitting}
          submitLabel="Secure Payment"
          onBack={goBack}
          onNext={goNext}
        />
      </div>

      {showEstimate ? (
        <aside className="order-last hidden lg:sticky lg:top-6 lg:block lg:h-fit">
          <BookingEstimate
            values={values}
            selectedService={selectedService}
            selectedAddons={selectedAddons}
            estimatedTotal={estimatedTotal}
            paymentSummary={paymentSummary}
          />
        </aside>
      ) : null}
        </form>
      </section>
    </>
  );
}

function BookingHeader({
  currentStep,
  customerName,
  loggedIn,
}: {
  currentStep: number;
  customerName: string | null;
  loggedIn: boolean;
}) {
  const initials = getInitials(customerName ?? "Shalean customer");

  return (
    <header className="sticky top-0 z-40 border-b border-primary/10 bg-background/90 shadow-[0_8px_24px_rgba(10,66,42,0.07)] backdrop-blur-xl">
      <div className="mx-auto grid h-16 w-full max-w-6xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-5 sm:px-8 lg:px-10">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground shadow-[0_10px_22px_rgba(8,105,62,0.22)]">
            <Sparkles className="size-5" />
          </span>
          <span className="hidden min-w-0 sm:block">
            <span className="block truncate text-base font-semibold leading-tight">
              Shalean
            </span>
            <span className="block truncate text-xs font-medium text-muted-foreground">
              Cleaning Services
            </span>
          </span>
        </Link>
        <HeaderProgressIndicator currentStep={currentStep} />
        {loggedIn ? (
          <Link
            href="/account"
            aria-label="Open account"
            className="grid size-10 shrink-0 place-items-center rounded-full border border-primary/20 bg-primary/10 text-sm font-semibold text-primary shadow-sm transition hover:border-primary/40 hover:bg-primary/15"
          >
            {initials}
          </Link>
        ) : (
          <Link
            href="/login?redirect=%2Fbook"
            className={buttonVariants({
              className: "h-10 px-4 shadow-sm",
            })}
          >
            Login
          </Link>
        )}
      </div>
    </header>
  );
}

function HeaderProgressIndicator({ currentStep }: { currentStep: number }) {
  return (
    <nav
      aria-label="Booking progress"
      className="min-w-0 overflow-x-auto px-1"
    >
      <div className="mx-auto flex min-w-[180px] max-w-2xl items-start sm:min-w-[520px]">
        {steps.map((step, index) => {
          const completed = index < currentStep;
          const active = index === currentStep;
          const reached = index <= currentStep;

          return (
            <div
              key={step.slug}
              className="relative flex flex-1 flex-col items-center gap-1 text-center"
            >
              {index < steps.length - 1 ? (
                <span
                  className={cn(
                    "absolute left-1/2 top-4 hidden h-0.5 w-full -translate-y-1/2 bg-border sm:block",
                    reached && "bg-primary"
                  )}
                />
              ) : null}
              <span
                className={cn(
                  "relative z-10 grid size-6 place-items-center rounded-full border border-border bg-background text-xs font-bold text-muted-foreground shadow-sm transition sm:size-8 sm:text-sm",
                  reached &&
                    "border-primary bg-primary text-primary-foreground shadow-[0_6px_14px_rgba(8,105,62,0.18)]",
                  active && "ring-2 ring-primary/15"
                )}
              >
                {completed ? <Check className="size-3 sm:size-3.5" /> : index + 1}
              </span>
              <span
                className={cn(
                  "relative z-10 hidden max-w-20 truncate text-xs font-semibold leading-none text-muted-foreground sm:block",
                  reached && "text-primary"
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </nav>
  );
}

function getInitials(name: string) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return initials || "SC";
}

function TrustBadges() {
  return (
    <div className="grid gap-3 rounded-lg border border-primary/10 bg-card/65 p-3 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
      {trustBadges.map((badge, index) => {
        const Icon = badge.icon;

        return (
          <div
            key={badge.label}
            className={cn(
              "flex min-h-11 items-center justify-center gap-2 px-2 text-sm font-semibold text-muted-foreground",
              index > 0 && "lg:border-l lg:border-border"
            )}
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
              <Icon className="size-4" />
            </span>
            <span>{badge.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function MobileEstimate({
  open,
  onToggle,
  values,
  selectedService,
  selectedAddons,
  estimatedTotal,
  paymentSummary,
}: {
  open: boolean;
  onToggle: () => void;
  values: BookingWizardValues;
  selectedService?: ServiceConfig;
  selectedAddons: ReturnType<typeof getSelectedAddons>;
  estimatedTotal: number;
  paymentSummary: ReturnType<typeof getPaymentSummary>;
}) {
  return (
    <Card className="rounded-lg border border-primary/20 bg-primary/5 shadow-sm lg:hidden">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span>
          <span className="block text-sm font-medium text-muted-foreground">
            Booking estimate
          </span>
          <span className="mt-1 block text-2xl font-semibold tracking-normal">
            {formatRand(estimatedTotal)}
          </span>
        </span>
        <span className="grid size-9 place-items-center rounded-full border bg-card text-primary">
          {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </span>
      </button>
      {open ? (
        <CardContent className="px-5 pb-5">
          <EstimateContent
            values={values}
            selectedService={selectedService}
            selectedAddons={selectedAddons}
            estimatedTotal={estimatedTotal}
            paymentSummary={paymentSummary}
          />
        </CardContent>
      ) : null}
    </Card>
  );
}

function BookingEstimate({
  values,
  selectedService,
  selectedAddons,
  estimatedTotal,
  paymentSummary,
}: {
  values: BookingWizardValues;
  selectedService?: ServiceConfig;
  selectedAddons: ReturnType<typeof getSelectedAddons>;
  estimatedTotal: number;
  paymentSummary: ReturnType<typeof getPaymentSummary>;
}) {
  return (
    <Card className="rounded-lg border border-primary/20 bg-primary/5 shadow-sm">
      <CardHeader className="px-5 pt-5">
        <CardTitle className="text-lg">Booking estimate</CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        <EstimateContent
          values={values}
          selectedService={selectedService}
          selectedAddons={selectedAddons}
          estimatedTotal={estimatedTotal}
          paymentSummary={paymentSummary}
        />
      </CardContent>
    </Card>
  );
}

function EstimateContent({
  values,
  selectedService,
  selectedAddons,
  estimatedTotal,
  paymentSummary,
}: {
  values: BookingWizardValues;
  selectedService?: ServiceConfig;
  selectedAddons: ReturnType<typeof getSelectedAddons>;
  estimatedTotal: number;
  paymentSummary: ReturnType<typeof getPaymentSummary>;
}) {
  return (
    <div className="grid gap-5">
      <div>
        <p className="text-sm font-medium text-muted-foreground">Selected service</p>
        <p className="mt-1 text-base font-semibold">
          {selectedService?.name ?? "Choose a service"}
        </p>
      </div>
      <Separator />
      <div>
        <p className="text-sm font-medium text-muted-foreground">Base price</p>
        <p className="mt-1 font-semibold">
          {selectedService ? formatRand(selectedService.basePrice) : formatRand(0)}
        </p>
      </div>
      <div>
        <p className="text-sm font-medium text-muted-foreground">Add-ons</p>
        <p className="mt-1 font-semibold leading-6">
          {selectedAddons.length
            ? selectedAddons.map((addon) => addon.label).join(", ")
            : "None selected"}
        </p>
      </div>
      <Separator />
      <div>
        <p className="text-sm font-medium text-muted-foreground">Estimated total</p>
        <p className="mt-1 text-4xl font-semibold tracking-normal">
          {formatRand(estimatedTotal)}
        </p>
      </div>
      <div className="rounded-lg border border-border/80 bg-card p-4 shadow-sm">
        <p className="text-sm font-medium text-muted-foreground">Selected payment</p>
        <p className="mt-1 font-semibold">{values.paymentType}</p>
        <p className="mt-3 text-sm text-muted-foreground">
          Pay now: {formatRand(paymentSummary.amountDue)}
        </p>
        {paymentSummary.balanceDue > 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">
            Balance later: {formatRand(paymentSummary.balanceDue)}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function StepCard({
  icon: Icon,
  title,
  variant = "card",
  children,
}: {
  icon: typeof Sparkles;
  title: string;
  variant?: "card" | "plain";
  children: React.ReactNode;
}) {
  const plain = variant === "plain";

  return (
    <Card
      className={cn(
        "rounded-lg",
        plain
          ? "overflow-visible border-0 bg-transparent py-0 shadow-none ring-0"
          : "border border-border/80 bg-card shadow-sm"
      )}
    >
      <CardHeader className={cn(plain ? "px-0 pt-0" : "px-5 pt-5")}>
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-full bg-primary/10 text-primary">
            <Icon className="size-5" />
          </span>
          <CardTitle className="text-lg">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className={cn(plain ? "px-0 pb-0" : "px-5 pb-5")}>
        {children}
      </CardContent>
    </Card>
  );
}

function GroupedPanel({
  title,
  variant = "card",
  children,
}: {
  title: string;
  variant?: "card" | "plain";
  children: React.ReactNode;
}) {
  const plain = variant === "plain";

  return (
    <section
      className={cn(
        "rounded-lg",
        plain
          ? "border-0 bg-transparent p-0 shadow-none"
          : "border border-border/80 bg-background p-4 shadow-sm"
      )}
    >
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      <div className="mt-4">{children}</div>
    </section>
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

  if (question.type === "number") {
    return (
      <Field label={question.label} error={error}>
        <Controller
          control={control}
          name={fieldName}
          render={({ field }) => (
            <NumberStepper
              value={Number(field.value ?? getQuestionDefaultValue(question) ?? 0)}
              min={0}
              onChange={field.onChange}
            />
          )}
        />
      </Field>
    );
  }

  if (question.type === "select" && question.options?.length) {
    return (
      <div className="sm:col-span-2">
        <Field label={question.label} error={error}>
          <Controller
            control={control}
            name={fieldName}
            render={({ field }) => (
              <SegmentedChoice
                value={typeof field.value === "string" ? field.value : ""}
                options={question.options ?? []}
                onChange={field.onChange}
              />
            )}
          />
        </Field>
      </div>
    );
  }

  if (question.type === "select") {
    return (
      <div className="sm:col-span-2">
        <Field label={question.label} error={error}>
          <FieldError message="No options are configured for this question." />
        </Field>
      </div>
    );
  }

  if (question.type === "textarea") {
    return (
      <div className="sm:col-span-2">
        <Field label={question.label} error={error}>
          <Textarea
            className={textareaControlClass}
            placeholder={question.placeholder}
            {...register(fieldName)}
          />
        </Field>
      </div>
    );
  }

  if (question.type === "time") {
    return (
      <Field label={question.label} error={error}>
        <Controller
          control={control}
          name={fieldName}
          render={({ field }) => (
            <TimePickerField
              value={typeof field.value === "string" ? field.value : ""}
              onChange={field.onChange}
            />
          )}
        />
      </Field>
    );
  }

  return (
    <Field label={question.label} error={error}>
      <Input
        type={question.type}
        placeholder={question.placeholder}
        className={fieldControlClass}
        {...register(fieldName)}
      />
    </Field>
  );
}

function PreferredDaysField({
  value,
  onChange,
}: {
  value: string[];
  onChange: (value: BookingWizardValues["recurringPreferredDays"]) => void;
}) {
  const selectedDays = value;

  return (
    <div className="grid gap-3">
      <div className="grid gap-2 sm:grid-cols-4">
        {recurringDays.map((day) => {
          const selected = selectedDays.includes(day);

          return (
            <button
              key={day}
              type="button"
              className={cn(
                "flex h-11 items-center justify-center rounded-lg border border-border/80 bg-card px-3 text-sm font-bold shadow-sm transition hover:border-primary/50 hover:bg-primary/5",
                selected &&
                  "border-primary bg-primary text-primary-foreground shadow-[0_10px_20px_rgba(8,105,62,0.16)]"
              )}
              onClick={() => {
                const next = selected
                  ? selectedDays.filter((selectedDay) => selectedDay !== day)
                  : [...selectedDays, day];

                onChange(next as BookingWizardValues["recurringPreferredDays"]);
              }}
            >
              {day.slice(0, 3)}
            </button>
          );
        })}
      </div>
      <p className="text-sm leading-6 text-muted-foreground">
        {selectedDays.length
          ? formatPreferredDays(selectedDays)
          : "Choose at least one day"}
      </p>
    </div>
  );
}

function TimePickerField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={open}
        className={cn(
          fieldControlClass,
          "flex w-full items-center justify-between gap-3 border border-input bg-card text-left text-sm font-medium"
        )}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="inline-flex min-w-0 items-center gap-2">
          <Clock className="size-4 shrink-0 text-primary" />
          <span className={cn(!value && "text-muted-foreground")}>
            {value ? formatTimeLabel(value) : "Choose a time"}
          </span>
        </span>
        <ChevronDown
          className={cn("size-4 shrink-0 text-muted-foreground transition", open && "rotate-180")}
        />
      </button>
      {open ? (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-60 overflow-y-auto rounded-lg border border-border/80 bg-popover p-2 shadow-lg">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {timeOptions.map((option) => {
              const selected = value === option;

              return (
                <button
                  key={option}
                  type="button"
                  className={cn(
                    "rounded-md border border-border/70 bg-card px-3 py-2 text-sm font-semibold transition hover:border-primary/50 hover:bg-primary/5",
                    selected && "border-primary bg-primary text-primary-foreground"
                  )}
                  onClick={() => {
                    onChange(option);
                    setOpen(false);
                  }}
                >
                  {formatTimeLabel(option)}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SuburbSearchField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const normalizedQuery = query.trim().toLowerCase();
  const filteredSuburbs = suburbOptions
    .filter((suburb) => suburb.toLowerCase().includes(normalizedQuery))
    .slice(0, 8);
  const showCustomOption =
    query.trim().length >= 2 &&
    !suburbOptions.some(
      (suburb) => suburb.toLowerCase() === normalizedQuery
    );

  function selectSuburb(suburb: string) {
    onChange(suburb);
    setQuery(suburb);
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={open}
        className={cn(
          fieldControlClass,
          "flex w-full items-center justify-between gap-3 border border-input bg-card text-left text-sm font-medium"
        )}
        onClick={() => {
          setQuery(value);
          setOpen((current) => !current);
        }}
      >
        <span className="inline-flex min-w-0 items-center gap-2">
          <MapPin className="size-4 shrink-0 text-primary" />
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {value || "Search suburb"}
          </span>
        </span>
        <ChevronDown
          className={cn("size-4 shrink-0 text-muted-foreground transition", open && "rotate-180")}
        />
      </button>
      {open ? (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 rounded-lg border border-border/80 bg-popover p-2 shadow-lg">
          <div className="flex h-11 items-center gap-2 rounded-md border border-input bg-card px-3">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              placeholder="Search suburb"
              className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground"
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && query.trim()) {
                  event.preventDefault();
                  selectSuburb(filteredSuburbs[0] ?? query.trim());
                }
              }}
            />
          </div>
          <div className="mt-2 grid max-h-60 gap-1 overflow-y-auto">
            {filteredSuburbs.map((suburb) => {
              const selected = value === suburb;

              return (
                <button
                  key={suburb}
                  type="button"
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm font-semibold transition hover:bg-primary/5",
                    selected && "bg-primary/10 text-primary"
                  )}
                  onClick={() => selectSuburb(suburb)}
                >
                  <span>{suburb}</span>
                  {selected ? <Check className="size-4" /> : null}
                </button>
              );
            })}
            {showCustomOption ? (
              <button
                type="button"
                className="rounded-md border border-dashed border-primary/40 px-3 py-2 text-left text-sm font-semibold text-primary transition hover:bg-primary/5"
                onClick={() => selectSuburb(query.trim())}
              >
                Use &quot;{query.trim()}&quot;
              </button>
            ) : null}
            {!filteredSuburbs.length && !showCustomOption ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">
                Type at least 2 characters to add a suburb.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DatePickerField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const selectedDate = parseDateValue(value);
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const baseDate = selectedDate ?? new Date();
    return new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
  });
  const calendarDays = useMemo(
    () => getCalendarDays(visibleMonth),
    [visibleMonth]
  );

  function moveMonth(offset: number) {
    setVisibleMonth(
      (current) => new Date(current.getFullYear(), current.getMonth() + offset, 1)
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={open}
        className={cn(
          fieldControlClass,
          "flex w-full items-center justify-between gap-3 border border-input bg-card text-left text-sm font-medium"
        )}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="inline-flex min-w-0 items-center gap-2">
          <CalendarCheck className="size-4 shrink-0 text-primary" />
          <span className={cn(!value && "text-muted-foreground")}>
            {selectedDate ? formatDateLabel(selectedDate) : "Choose a date"}
          </span>
        </span>
        <ChevronDown
          className={cn("size-4 shrink-0 text-muted-foreground transition", open && "rotate-180")}
        />
      </button>
      {open ? (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 rounded-lg border border-border/80 bg-popover p-3 shadow-lg">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              aria-label="Previous month"
              className="grid size-9 place-items-center rounded-md border border-border/70 bg-card text-primary transition hover:bg-primary/5"
              onClick={() => moveMonth(-1)}
            >
              <ArrowLeft className="size-4" />
            </button>
            <p className="text-sm font-semibold">
              {visibleMonth.toLocaleDateString("en-ZA", {
                month: "long",
                year: "numeric",
              })}
            </p>
            <button
              type="button"
              aria-label="Next month"
              className="grid size-9 place-items-center rounded-md border border-border/70 bg-card text-primary transition hover:bg-primary/5"
              onClick={() => moveMonth(1)}
            >
              <ArrowRight className="size-4" />
            </button>
          </div>
          <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted-foreground">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-7 gap-1">
            {calendarDays.map((day) => {
              const dateValue = formatDateValue(day.date);
              const selected = value === dateValue;

              return (
                <button
                  key={dateValue}
                  type="button"
                  className={cn(
                    "grid aspect-square place-items-center rounded-md border border-transparent text-sm font-semibold transition hover:border-primary/40 hover:bg-primary/5",
                    !day.currentMonth && "text-muted-foreground/45",
                    selected && "border-primary bg-primary text-primary-foreground"
                  )}
                  onClick={() => {
                    onChange(dateValue);
                    setOpen(false);
                  }}
                >
                  {day.date.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function formatTimeLabel(value: string) {
  const [hourValue, minuteValue] = value.split(":").map(Number);

  if (!Number.isFinite(hourValue) || !Number.isFinite(minuteValue)) {
    return value;
  }

  const suffix = hourValue >= 12 ? "PM" : "AM";
  const hour = hourValue % 12 || 12;

  return `${hour}:${String(minuteValue).padStart(2, "0")} ${suffix}`;
}

function parseDateValue(value: string) {
  if (!value) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  return new Date(year, month - 1, day);
}

function formatDateValue(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function formatDateLabel(date: Date) {
  return date.toLocaleDateString("en-ZA", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getCalendarDays(month: Date) {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const startDate = new Date(firstDay);
  startDate.setDate(firstDay.getDate() - startOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);

    return {
      date,
      currentMonth: date.getMonth() === month.getMonth(),
    };
  });
}

function NumberStepper({
  value,
  min,
  max,
  onChange,
}: {
  value: number;
  min: number;
  max?: number;
  onChange: (value: number) => void;
}) {
  const normalizedValue = Number.isFinite(value) ? value : min;
  const canIncrease = max === undefined || normalizedValue < max;

  return (
    <div className="grid h-12 grid-cols-[44px_minmax(0,1fr)_44px] overflow-hidden rounded-lg border border-border/80 bg-card shadow-sm">
      <button
        type="button"
        aria-label="Decrease value"
        className="grid place-items-center border-r border-border/80 text-primary transition hover:bg-primary/5 disabled:cursor-not-allowed disabled:text-muted-foreground"
        disabled={normalizedValue <= min}
        onClick={() => onChange(Math.max(min, normalizedValue - 1))}
      >
        <Minus className="size-4" />
      </button>
      <span className="grid place-items-center text-lg font-semibold tabular-nums">
        {normalizedValue}
      </span>
      <button
        type="button"
        aria-label="Increase value"
        className="grid place-items-center border-l border-border/80 text-primary transition hover:bg-primary/5"
        disabled={!canIncrease}
        onClick={() => onChange(max === undefined ? normalizedValue + 1 : Math.min(max, normalizedValue + 1))}
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}

function SegmentedChoice({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-4">
      {options.map((option) => {
        const selected = value === option;

        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={cn(
              choiceCardClass,
              "grid min-h-14 place-items-center px-3 py-3 text-center text-sm font-semibold",
              selected && choiceCardSelectedClass
            )}
          >
            {option}
          </button>
        );
      })}
    </div>
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
    <div className="grid gap-2.5">
      <Label className="text-sm font-semibold leading-none">{label}</Label>
      {children}
      <FieldError message={error} />
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return (
    <p className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm font-medium leading-5 text-destructive/90">
      {message}
    </p>
  );
}

function CleanerModeCard({
  checked,
  title,
  description,
  onClick,
}: {
  checked: boolean;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        choiceCardClass,
        "grid min-h-28 gap-3 p-4",
        checked && choiceCardSelectedClass
      )}
    >
      <span className="flex items-start justify-between gap-3">
        <span>
          <span className="block font-semibold leading-snug">{title}</span>
          <span className="mt-2 block text-sm leading-6 text-muted-foreground">
            {description}
          </span>
        </span>
        <span
          className={cn(
            "grid size-7 shrink-0 place-items-center rounded-full border bg-background text-primary transition",
            checked && "border-primary bg-primary text-primary-foreground"
          )}
        >
          {checked ? <Check className="size-3.5" /> : null}
        </span>
      </span>
    </button>
  );
}

function CleanerCard({
  cleaner,
  selected,
  hasSchedule,
  onSelect,
}: {
  cleaner: Cleaner;
  selected: boolean;
  hasSchedule: boolean;
  onSelect: () => void;
}) {
  const initials = cleaner.full_name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <div
      className={cn(
        choiceCardClass,
        "grid gap-4 p-4",
        selected && choiceCardSelectedClass
      )}
    >
      <div className="flex items-start gap-3">
        {cleaner.profile_photo ? (
          <span
            aria-label={cleaner.full_name}
            className="size-12 shrink-0 rounded-full bg-cover bg-center ring-1 ring-border"
            style={{ backgroundImage: `url(${cleaner.profile_photo})` }}
          />
        ) : (
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary ring-1 ring-primary/20">
            {initials || "SC"}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold leading-snug">{cleaner.full_name}</p>
              <div className="mt-2 flex flex-wrap gap-3 text-xs font-medium text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Star className="size-3.5 text-primary" />
                  {cleaner.rating.toFixed(1)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Users className="size-3.5 text-primary" />
                  {cleaner.completed_jobs} jobs
                </span>
              </div>
            </div>
            {selected ? (
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
                <Check className="size-3.5" />
              </span>
            ) : null}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {cleaner.specialties.slice(0, 3).map((specialty) => (
          <span
            key={specialty}
            className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
          >
            {specialty}
          </span>
        ))}
      </div>
      <div className="flex flex-col gap-3 border-t border-border/80 pt-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-6 text-muted-foreground">
          {hasSchedule
            ? "Preference saved. Live availability is confirmed by the team."
            : "Choose date and time to help confirm availability."}
        </p>
        <Button
          type="button"
          size="sm"
          className="h-9 bg-primary px-4 hover:bg-primary/90"
          onClick={onSelect}
        >
          Select
        </Button>
      </div>
    </div>
  );
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
  const full = getPaymentSummary(estimatedTotal, "Full Payment");

  return (
    <div className="grid gap-4 rounded-lg border border-border/80 bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <CreditCard className="size-4 text-primary" />
        <p className="font-semibold">Payment option</p>
      </div>
      <div className="grid gap-4">
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
        choiceCardClass,
        "grid min-h-32 gap-3 p-5",
        checked && choiceCardSelectedClass
      )}
    >
      <span className="flex items-center justify-between gap-3">
        <span className="font-semibold">{title}</span>
        <span
          className={cn(
            "grid size-7 shrink-0 place-items-center rounded-full border bg-background text-primary transition",
            checked && "border-primary bg-primary text-primary-foreground"
          )}
        >
          {checked ? <Check className="size-3.5" /> : null}
        </span>
      </span>
      <span className="text-sm font-medium text-muted-foreground">{description}</span>
      <span className="text-xs leading-5 text-muted-foreground">{meta}</span>
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
        ["Payment option", "Full Payment"],
        ["Estimated total", formatRand(summary.estimatedTotal)],
        ["Full payment amount", formatRand(estimatedTotal)],
        ["Amount due now", formatRand(summary.amountDue)],
      ]}
    />
  );
}

function BookingReview({
  values,
  service,
  selectedAddons,
  estimatedTotal,
  recurringFrequency,
  recurringDayLabel,
}: {
  values: BookingWizardValues;
  service: ServiceConfig;
  selectedAddons: ReturnType<typeof getSelectedAddons>;
  estimatedTotal: number;
  recurringFrequency: ReturnType<typeof normalizeRecurringFrequency>;
  recurringDayLabel: string;
}) {
  const scheduleItems: [string, string][] = recurringFrequency
    ? [
        ["Frequency", recurringFrequency],
        [
          recurringFrequency === "Weekly" ? "Preferred days" : "Preferred day",
          recurringDayLabel,
        ],
        ["Start date", values.bookingDate],
        ["Preferred time", values.bookingTime],
      ]
    : [
        ["Date", values.bookingDate],
        ["Time", values.bookingTime],
      ];

  return (
    <div className="grid gap-5">
      <ReviewSection
        title="Service"
        items={[
          ["Service type", service.name],
          ["Estimated total", formatRand(estimatedTotal)],
          ...service.questions.map((question) => [
            question.label,
            String(values.serviceData[question.id] ?? ""),
          ] as [string, string]),
        ]}
      />
      <ReviewSection
        title="Cleaner"
        items={[
          [
            "Selection",
            !canCustomerChooseCleaners(service.name)
              ? "Admin-assigned team"
              : values.cleanerSelectionType === "preferred"
              ? "Preferred cleaner"
              : "Auto-assign best available cleaner",
          ],
          ["Number of cleaners", String(values.numberOfCleaners)],
          [
            "Preferred cleaner",
            !canCustomerChooseCleaners(service.name)
              ? "Assigned after booking"
              : values.cleanerSelectionType === "preferred"
              ? values.preferredCleanerName || "Not selected"
              : "Not applicable",
          ],
        ]}
      />
      <ReviewSection
        title="Schedule"
        items={scheduleItems}
      />
      <ReviewSection
        title="Address"
        items={[
          ["Street address", values.address],
          ["Suburb", values.suburb],
          ["City", values.city],
          ["Access instructions", values.accessInstructions || "None"],
          ["Gate code", values.gateCode || "None"],
          ["Parking instructions", values.parkingInstructions || "None"],
        ]}
      />
      <ReviewSection
        title="Contact"
        items={[
          ["Customer", values.customerName],
          ["Email", values.customerEmail],
          ["Phone", values.customerPhone],
          ["Notes", values.notes || "None"],
        ]}
      />
      <ReviewSection
        title="Add-ons"
        items={
          selectedAddons.length
            ? selectedAddons.map((addon) => [addon.label, formatRand(addon.price)])
            : [["Selected add-ons", "None"]]
        }
      />
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
    <div className="rounded-lg border border-border/80 bg-card p-5 shadow-sm">
      <p className="font-semibold">{title}</p>
      <dl className="mt-4 grid gap-3 text-sm">
        {items.map(([label, value]) => (
          <div
            key={`${title}-${label}`}
            className="grid gap-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] sm:gap-4"
          >
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-medium leading-6 sm:text-right">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function getInitialServiceSlug(
  services: ServiceConfig[],
  storedServiceSlug: string,
  initialServiceSlug?: string
) {
  if (initialServiceSlug !== undefined) {
    return services.some((service) => service.slug === initialServiceSlug)
      ? initialServiceSlug
      : services[0]?.slug ?? "";
  }

  if (
    storedServiceSlug &&
    services.some((service) => service.slug === storedServiceSlug)
  ) {
    return storedServiceSlug;
  }

  return services[0]?.slug ?? "";
}

function getInitialStepIndex(initialStepSlug: string | undefined, storedStep: number) {
  if (!initialStepSlug) {
    return Math.min(Math.max(storedStep, 0), steps.length - 1);
  }

  const stepIndex = steps.findIndex((step) => step.slug === initialStepSlug);
  return stepIndex >= 0 ? stepIndex : 0;
}

function getStepHeroCopy(
  currentStep: number,
  selectedService?: ServiceConfig,
  isRecurring = false
) {
  if (currentStep === 1 && selectedService) {
    return {
      title: `${selectedService.name} details`,
      description: "Set the room count, frequency, and extras for this service.",
    };
  }

  if (currentStep === 2) {
    return {
      title: "Choose your schedule",
      description: "Pick how you want Shalean to match your cleaner and time.",
    };
  }

  if (currentStep === 3) {
    return {
      title: "Where should we clean?",
      description: "Add the address and contact details for the booking.",
    };
  }

  if (currentStep === 4) {
    return {
      title: isRecurring ? "Review and pay" : "Review and pay",
      description: isRecurring
        ? "Confirm the recurring schedule before secure checkout."
        : "Confirm your booking details before secure checkout.",
    };
  }

  return {
    title: "What cleaning do you need?",
    description: "Choose the service that best fits your space.",
  };
}

function canCustomerChooseCleaners(serviceName: string) {
  return serviceName !== "Deep Cleaning" && serviceName !== "Moving Cleaning";
}

function getDefaultServiceData(service: ServiceConfig) {
  return service.questions.reduce<Record<string, number>>((defaults, question) => {
    const defaultValue = getQuestionDefaultValue(question);

    if (defaultValue !== undefined) {
      defaults[question.id] = defaultValue;
    }

    return defaults;
  }, {});
}

function getQuestionDefaultValue(question: ServiceQuestion) {
  if (question.id === "bedrooms") {
    return 2;
  }

  if (question.id === "bathrooms" || question.id === "number_of_bathrooms") {
    return 1;
  }

  return undefined;
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
  submitLabel,
  onBack,
  onNext,
}: {
  currentStep: number;
  isSubmitting: boolean;
  submitLabel: string;
  onBack: () => void;
  onNext: () => void;
}) {
  const atEnd = currentStep === steps.length - 1;

  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 p-4 shadow-[0_-12px_30px_rgba(0,0,0,0.06)] backdrop-blur lg:static lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-none">
      <div className="mx-auto flex max-w-6xl gap-3 lg:justify-between">
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="h-12 flex-1 gap-2 border-border/80 bg-card px-6 text-base font-bold shadow-sm hover:border-primary/30 hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-45 lg:flex-none"
          disabled={currentStep === 0 || isSubmitting}
          onClick={onBack}
        >
          <ArrowLeft className="size-4" />
          Back
        </Button>
        {atEnd ? (
          <Button
            type="submit"
            size="lg"
            className="h-12 flex-1 gap-2 bg-primary px-6 text-base font-bold shadow-[0_12px_24px_rgba(8,105,62,0.18)] hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60 lg:flex-none"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-1 animate-spin" />
                Saving
              </>
            ) : (
              <>
                {submitLabel}
                <ArrowRight className="size-4" />
              </>
            )}
          </Button>
        ) : (
          <Button
            type="button"
            size="lg"
            className="h-12 flex-1 gap-2 bg-primary px-6 text-base font-bold shadow-[0_12px_24px_rgba(8,105,62,0.18)] hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60 lg:flex-none"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onNext();
            }}
          >
            Next
            <ArrowRight className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
