import { z } from "zod";

import {
  formatPreferredDays,
  recurringDays,
} from "@/lib/recurring-schedule";
import { paymentTypes } from "@/lib/types";

const serviceValueSchema = z.union([z.string(), z.number()]);
const recurringDaySchema = z.enum(recurringDays);

export const recurringBookingSchema = z
  .object({
    serviceSlug: z.string().min(1, "Choose a cleaning service."),
    serviceData: z.record(z.string(), serviceValueSchema),
    selectedAddons: z.array(z.string()),
    frequency: z.enum(["Weekly", "Bi-weekly", "Monthly", "Custom days"], {
      error: "Choose a recurring frequency.",
    }),
    preferredDay: z.string().min(1, "Choose a preferred day."),
    preferredDays: z.array(recurringDaySchema),
    preferredTime: z.string().min(1, "Choose a preferred time."),
    nextBookingDate: z.string().min(1, "Choose the first booking date."),
    selectedAddressId: z.string().optional(),
    address: z.string().min(3, "Enter the street address."),
    suburb: z.string().min(2, "Enter the suburb."),
    city: z.string().min(2, "Enter the city."),
    saveAddress: z.boolean(),
    addressLabel: z.string().optional(),
    accessInstructions: z.string().optional(),
    gateCode: z.string().optional(),
    parkingInstructions: z.string().optional(),
    paymentType: z.enum(paymentTypes, {
      error: "Choose a payment option.",
    }),
  })
  .superRefine((values, ctx) => {
    if (
      (values.frequency === "Weekly" || values.frequency === "Custom days") &&
      !values.preferredDays.length
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["preferredDays"],
        message: "Choose at least one recurring day.",
      });
    }

    if (values.selectedAddons.some((addonId) => !addonId.trim())) {
      ctx.addIssue({
        code: "custom",
        path: ["selectedAddons"],
        message: "One or more add-ons are not valid.",
      });
    }
  });

export const recurringStatusSchema = z.object({
  recurringBookingId: z.string().uuid(),
  status: z.enum(["Active", "Paused", "Cancelled"]),
});

export const recurringChangeRequestSchema = z.object({
  recurringBookingId: z.string().uuid(),
  requestedChanges: z
    .string()
    .min(10, "Tell us what you would like to change."),
});

export type RecurringBookingValues = z.infer<typeof recurringBookingSchema>;

export const defaultRecurringBookingValues: RecurringBookingValues = {
  serviceSlug: "",
  serviceData: {},
  selectedAddons: [],
  frequency: "Weekly",
  preferredDay: "Monday",
  preferredDays: ["Monday"],
  preferredTime: "09:00",
  nextBookingDate: "",
  selectedAddressId: "",
  address: "",
  suburb: "",
  city: "",
  saveAddress: false,
  addressLabel: "",
  accessInstructions: "",
  gateCode: "",
  parkingInstructions: "",
  paymentType: "Full Payment",
};

export function getRecurringPreferredDayLabel(values: {
  frequency: "Weekly" | "Bi-weekly" | "Monthly" | "Custom days";
  preferredDay: string;
  preferredDays: string[];
}) {
  return values.frequency === "Weekly" || values.frequency === "Custom days"
    ? formatPreferredDays(values.preferredDays)
    : values.preferredDay;
}

export const reviewSchema = z.object({
  bookingId: z.string().uuid(),
  rating: z.coerce.number().int().min(1).max(5),
  reviewText: z.string().min(10, "Please share at least a short review."),
  public: z.boolean(),
});

export const invoiceStatusSchema = z.object({
  invoiceId: z.string().uuid(),
  invoiceStatus: z.enum(["Draft", "Sent", "Paid", "Partially Paid", "Cancelled"]),
});
