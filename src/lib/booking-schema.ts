import { z } from "zod";

import { getServiceBySlug } from "@/config/services";
import { paymentTypes } from "@/lib/types";

const serviceValueSchema = z.union([z.string(), z.number()]);

export const bookingWizardSchema = z
  .object({
    serviceSlug: z.string().min(1, "Choose a cleaning service."),
    serviceData: z.record(z.string(), serviceValueSchema),
    selectedAddons: z.array(z.string()),
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
    const service = getServiceBySlug(values.serviceSlug);

    if (!service) {
      ctx.addIssue({
        code: "custom",
        path: ["serviceSlug"],
        message: "Choose a valid cleaning service.",
      });
      return;
    }

    for (const question of service.questions) {
      const value = values.serviceData[question.id];
      const empty =
        value === undefined ||
        value === null ||
        (typeof value === "string" && !value.trim());

      if (question.required && empty) {
        ctx.addIssue({
          code: "custom",
          path: ["serviceData", question.id],
          message: `${question.label} is required.`,
        });
      }

      if (question.type === "number" && !empty) {
        const numericValue = Number(value);
        if (!Number.isFinite(numericValue) || numericValue < 0) {
          ctx.addIssue({
            code: "custom",
            path: ["serviceData", question.id],
            message: `${question.label} must be a valid number.`,
          });
        }
      }

      if (question.type === "select" && !empty && question.options) {
        if (!question.options.includes(String(value))) {
          ctx.addIssue({
            code: "custom",
            path: ["serviceData", question.id],
            message: `Choose a valid option for ${question.label}.`,
          });
        }
      }
    }

    const validAddonIds = new Set(service.addons.map((addon) => addon.id));
    for (const addonId of values.selectedAddons) {
      if (!validAddonIds.has(addonId)) {
        ctx.addIssue({
          code: "custom",
          path: ["selectedAddons"],
          message: "One or more add-ons are not available for this service.",
        });
      }
    }
  });

export type BookingWizardValues = z.infer<typeof bookingWizardSchema>;

export const defaultBookingWizardValues: BookingWizardValues = {
  serviceSlug: "",
  serviceData: {},
  selectedAddons: [],
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
  paymentType: "Deposit",
};
