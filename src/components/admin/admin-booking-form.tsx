"use client";

import { useMemo, useState } from "react";

import { createAdminDraftBooking } from "@/app/actions";
import type { ServiceConfig } from "@/config/services";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { calculateBookingPricing, formatRand, getSelectedAddons } from "@/lib/pricing";
import { recurringDays } from "@/lib/recurring-schedule";
import type { Customer } from "@/lib/types";

const inputClassName =
  "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm";

type AdminBookingFormProps = {
  customers: Customer[];
  services: ServiceConfig[];
};

export function AdminBookingForm({ customers, services }: AdminBookingFormProps) {
  const [customerMode, setCustomerMode] = useState<"existing" | "new">(
    customers.length ? "existing" : "new"
  );
  const [customerSearch, setCustomerSearch] = useState("");
  const [frequency, setFrequency] = useState("Once-off");
  const [customDays, setCustomDays] = useState<string[]>([]);
  const [serviceSlug, setServiceSlug] = useState(services[0]?.slug ?? "");
  const [serviceData, setServiceData] = useState<Record<string, string | number>>({});
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const selectedService = services.find((service) => service.slug === serviceSlug);
  const filteredCustomers = useMemo(() => {
    const term = customerSearch.trim().toLowerCase();

    if (!term) {
      return customers;
    }

    return customers.filter((customer) =>
      [
        customer.full_name,
        customer.email,
        customer.phone ?? "",
      ].some((value) => value.toLowerCase().includes(term))
    );
  }, [customerSearch, customers]);
  const pricing = useMemo(
    () =>
      selectedService
        ? calculateBookingPricing(selectedService, selectedAddons, serviceData)
        : null,
    [selectedAddons, selectedService, serviceData]
  );

  function updateQuestion(id: string, value: string, type: string) {
    setServiceData((current) => ({
      ...current,
      [id]: type === "number" ? Number(value || 0) : value,
    }));
  }

  function toggleAddon(addonId: string) {
    setSelectedAddons((current) =>
      current.includes(addonId)
        ? current.filter((id) => id !== addonId)
        : [...current, addonId]
    );
  }

  function toggleCustomDay(day: string) {
    setCustomDays((current) =>
      current.includes(day)
        ? current.filter((item) => item !== day)
        : [...current, day]
    );
  }

  return (
    <form action={createAdminDraftBooking} className="grid gap-5">
      <input type="hidden" name="customer_mode" value={customerMode} />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-3 md:col-span-2">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={customerMode === "existing" ? "default" : "outline"}
              onClick={() => setCustomerMode("existing")}
              disabled={!customers.length}
            >
              Existing customer
            </Button>
            <Button
              type="button"
              variant={customerMode === "new" ? "default" : "outline"}
              onClick={() => setCustomerMode("new")}
            >
              Create New Customer
            </Button>
          </div>

          {customerMode === "existing" ? (
            <div className="grid gap-3">
              <Field label="Search customers">
                <input
                  value={customerSearch}
                  onChange={(event) => setCustomerSearch(event.target.value)}
                  placeholder="Name, phone, or email"
                  className={inputClassName}
                />
              </Field>
              {filteredCustomers.length ? (
                <Field label="Customer">
                  <select name="customer_id" required className={inputClassName}>
                    <option value="">Choose customer</option>
                    {filteredCustomers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.full_name} ({customer.email || customer.phone || "No contact"})
                      </option>
                    ))}
                  </select>
                </Field>
              ) : (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed p-3 text-sm">
                  <span className="text-muted-foreground">No matching customer found.</span>
                  <Button type="button" onClick={() => setCustomerMode("new")}>
                    Create New Customer
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <Card className="rounded-lg">
              <CardContent className="grid gap-4 p-4 md:grid-cols-2">
                <Field label="Full name">
                  <input name="new_customer_full_name" required className={inputClassName} />
                </Field>
                <Field label="Phone number">
                  <input name="new_customer_phone" required className={inputClassName} />
                </Field>
                <Field label="Email address">
                  <input
                    name="new_customer_email"
                    type="email"
                    required
                    className={inputClassName}
                  />
                </Field>
                <Field label="Customer notes">
                  <textarea
                    name="new_customer_notes"
                    className={`${inputClassName} min-h-24 py-3`}
                  />
                </Field>
              </CardContent>
            </Card>
          )}
        </div>

        <Field label="Service">
          <select
            name="service_slug"
            required
            value={serviceSlug}
            onChange={(event) => {
              setServiceSlug(event.target.value);
              setServiceData({});
              setSelectedAddons([]);
            }}
            className={inputClassName}
          >
            {services.map((service) => (
              <option key={service.slug} value={service.slug}>
                {service.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Booking date">
          <input name="booking_date" type="date" required className={inputClassName} />
        </Field>
        <Field label="Booking time">
          <input name="booking_time" type="time" required className={inputClassName} />
        </Field>
        <Field label="Number of cleaners">
          <input
            name="number_of_cleaners"
            type="number"
            min="1"
            max="5"
            defaultValue="1"
            className={inputClassName}
          />
        </Field>
        <Field label="Frequency">
          <select
            name="frequency"
            value={frequency}
            onChange={(event) => setFrequency(event.target.value)}
            className={inputClassName}
          >
            <option value="Once-off">Once-off</option>
            <option value="Weekly">Weekly</option>
            <option value="Bi-weekly">Bi-weekly</option>
            <option value="Monthly">Monthly</option>
            <option value="Custom days">Custom days</option>
          </select>
        </Field>
        <Field label="Initial status">
          <select name="status" defaultValue="Draft" className={inputClassName}>
            <option value="Draft">Draft</option>
            <option value="Pending Invoice">Pending invoice</option>
            <option value="Confirmed">Confirmed</option>
          </select>
        </Field>
      </div>

      {frequency === "Custom days" ? (
        <div className="grid gap-2">
          <p className="text-sm font-medium">Custom days</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {recurringDays.map((day) => (
              <label
                key={day}
                className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm"
              >
                <input
                  name="custom_days"
                  value={day}
                  type="checkbox"
                  checked={customDays.includes(day)}
                  onChange={() => toggleCustomDay(day)}
                  className="size-4"
                />
                {day}
              </label>
            ))}
          </div>
        </div>
      ) : null}

      {selectedService ? (
        <Card className="rounded-lg">
          <CardContent className="grid gap-4 p-4">
            <p className="font-medium">{selectedService.name} details</p>
            <div className="grid gap-4 md:grid-cols-2">
              {selectedService.questions.map((question) => (
                <Field key={question.id} label={question.label}>
                  {question.type === "select" ? (
                    <select
                      name={`service_data_${question.id}`}
                      required={question.required}
                      className={inputClassName}
                      onChange={(event) =>
                        updateQuestion(question.id, event.target.value, question.type)
                      }
                    >
                      <option value="">Choose</option>
                      {question.options?.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      name={`service_data_${question.id}`}
                      type={question.type === "number" ? "number" : question.type}
                      min={question.type === "number" ? "0" : undefined}
                      required={question.required}
                      className={inputClassName}
                      onChange={(event) =>
                        updateQuestion(question.id, event.target.value, question.type)
                      }
                    />
                  )}
                </Field>
              ))}
            </div>
            {selectedService.addons.length ? (
              <div className="grid gap-2">
                <p className="text-sm font-medium">Extras</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {selectedService.addons
                    .filter((addon) => addon.active !== false)
                    .map((addon) => (
                      <label
                        key={addon.id}
                        className="flex items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2 text-sm"
                      >
                        <span className="flex items-center gap-2">
                          <input
                            name="selected_addons"
                            value={addon.id}
                            type="checkbox"
                            checked={selectedAddons.includes(addon.id)}
                            onChange={() => toggleAddon(addon.id)}
                            className="size-4"
                          />
                          {addon.label}
                        </span>
                        <span>{formatRand(addon.price)}</span>
                      </label>
                    ))}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Street address">
          <input name="address" required className={inputClassName} />
        </Field>
        <Field label="Suburb">
          <input name="suburb" required className={inputClassName} />
        </Field>
        <Field label="City">
          <input name="city" required className={inputClassName} />
        </Field>
      </div>
      <Field label="Notes">
        <textarea name="notes" className={`${inputClassName} min-h-28 py-3`} />
      </Field>
      <input name="total_amount" type="hidden" value={pricing?.total ?? 0} />
      <Card className="rounded-lg border-primary/20 bg-primary/5">
        <CardContent className="grid gap-2 p-4 text-sm">
          <Detail label="Base" value={formatRand(pricing?.basePrice ?? 0)} />
          <Detail label="Rooms" value={formatRand(pricing?.roomTotal ?? 0)} />
          <Detail label="Bathrooms" value={formatRand(pricing?.bathroomTotal ?? 0)} />
          <Detail
            label="Extras"
            value={formatRand(
              selectedService
                ? getSelectedAddons(selectedService, selectedAddons).reduce(
                    (sum, addon) => sum + addon.price,
                    0
                  )
                : 0
            )}
          />
          <Detail label="Service fee" value={formatRand(pricing?.serviceFee ?? 0)} />
          <Detail label="Total" value={formatRand(pricing?.total ?? 0)} strong />
        </CardContent>
      </Card>
      <Button type="submit" className="w-fit">
        Save booking
      </Button>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-2 text-sm">
      <span className="font-medium">{label}</span>
      {children}
    </label>
  );
}

function Detail({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className={strong ? "flex justify-between text-base font-semibold" : "flex justify-between"}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
