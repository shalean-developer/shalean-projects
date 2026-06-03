"use client";

import { useMemo, useState } from "react";

import { createAdminDraftBooking } from "@/app/actions";
import type { ServiceConfig } from "@/config/services";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { calculateBookingPricing, formatRand, getSelectedAddons } from "@/lib/pricing";
import type { Customer } from "@/lib/types";

const inputClassName =
  "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm";

type AdminBookingFormProps = {
  customers: Customer[];
  services: ServiceConfig[];
};

export function AdminBookingForm({ customers, services }: AdminBookingFormProps) {
  const [serviceSlug, setServiceSlug] = useState(services[0]?.slug ?? "");
  const [serviceData, setServiceData] = useState<Record<string, string | number>>({});
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const selectedService = services.find((service) => service.slug === serviceSlug);
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

  return (
    <form action={createAdminDraftBooking} className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Customer">
          <select name="customer_id" required className={inputClassName}>
            <option value="">Choose customer</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.full_name} ({customer.email})
              </option>
            ))}
          </select>
        </Field>
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
        <Field label="Initial status">
          <select name="status" defaultValue="Draft" className={inputClassName}>
            <option value="Draft">Draft</option>
            <option value="Pending Invoice">Pending invoice</option>
            <option value="Confirmed">Confirmed</option>
          </select>
        </Field>
      </div>

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
