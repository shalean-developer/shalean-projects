import { z } from "zod";

import {
  normalizeRecurringFrequency,
  recurringDays,
} from "@/lib/recurring-schedule";
import { paymentTypes } from "@/lib/types";

const serviceValueSchema = z.union([z.string(), z.number()]);
const cleanerSelectionTypes = ["auto", "preferred"] as const;
const recurringDaySchema = z.enum(recurringDays);

export const bookingWizardSchema = z
  .object({
    serviceSlug: z.string().min(1, "Choose a cleaning service."),
    serviceData: z.record(z.string(), serviceValueSchema),
    selectedAddons: z.array(z.string()),
    recurringPreferredDays: z.array(recurringDaySchema),
    cleanerSelectionType: z.enum(cleanerSelectionTypes),
    preferredCleanerId: z.string().optional(),
    preferredCleanerName: z.string().optional(),
    bookingDate: z.string().min(1, "Choose a booking date."),
    bookingTime: z.string().min(1, "Choose a booking time."),
    address: z.string().min(3, "Enter the street address."),
    suburb: z.string().min(2, "Enter the suburb."),
    city: z.string().min(2, "Enter the city."),
    selectedAddressId: z.string().optional(),
    saveAddress: z.boolean(),
    addressLabel: z.string().optional(),
    accessInstructions: z.string().optional(),
    gateCode: z.string().optional(),
    parkingInstructions: z.string().optional(),
    customerName: z.string().min(2, "Enter the customer name."),
    customerEmail: z.email("Enter a valid email address."),
    customerPhone: z.string().min(7, "Enter a valid phone number."),
    notes: z.string().optional(),
    paymentType: z.enum(paymentTypes, {
      error: "Choose a payment option.",
    }),
  })
  .superRefine((values, ctx) => {
    const recurringFrequency = normalizeRecurringFrequency(
      values.serviceData.cleaning_frequency
    );

    if (
      recurringFrequency === "Weekly" &&
      !values.recurringPreferredDays.length
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["recurringPreferredDays"],
        message: "Choose at least one weekly day.",
      });
    }

    if (
      values.cleanerSelectionType === "preferred" &&
      !values.preferredCleanerId?.trim()
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["preferredCleanerId"],
        message: "Choose a preferred cleaner or use auto-assign.",
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

export type BookingWizardValues = z.infer<typeof bookingWizardSchema>;

export const defaultBookingWizardValues: BookingWizardValues = {
  serviceSlug: "",
  serviceData: {},
  selectedAddons: [],
  recurringPreferredDays: ["Monday"],
  cleanerSelectionType: "auto",
  preferredCleanerId: "",
  preferredCleanerName: "",
  bookingDate: "",
  bookingTime: "",
  address: "",
  suburb: "",
  city: "",
  selectedAddressId: "",
  saveAddress: false,
  addressLabel: "",
  accessInstructions: "",
  gateCode: "",
  parkingInstructions: "",
  customerName: "",
  customerEmail: "",
  customerPhone: "",
  notes: "",
  paymentType: "Full Payment",
};
