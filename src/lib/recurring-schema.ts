import { z } from "zod";

import { getServiceBySlug } from "@/config/services";

const serviceValueSchema = z.union([z.string(), z.number()]);

export const recurringBookingSchema = z
  .object({
    serviceSlug: z.string().min(1, "Choose a cleaning service."),
    serviceData: z.record(z.string(), serviceValueSchema),
    selectedAddons: z.array(z.string()),
    frequency: z.enum(["Weekly", "Bi-weekly", "Monthly"], {
      error: "Choose a recurring frequency.",
    }),
    preferredDay: z.string().min(1, "Choose a preferred day."),
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
};

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
