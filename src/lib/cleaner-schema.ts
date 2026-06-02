import { z } from "zod";

import { cleanerSpecialties } from "@/lib/types";

export const cleanerFormSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is required."),
  email: z.email("Enter a valid email address."),
  phone: z.string().trim().min(7, "Phone number is required."),
  profilePhoto: z.string().trim(),
  bio: z.string().trim(),
  specialties: z
    .array(z.enum(cleanerSpecialties))
    .min(1, "Select at least one specialty."),
  rating: z.number().min(0).max(5),
  completedJobs: z.number().int().min(0),
  active: z.boolean(),
});

export type CleanerFormValues = z.infer<typeof cleanerFormSchema>;

export const availabilityFormSchema = z
  .object({
    cleanerId: z.uuid(),
    availableDate: z.string().min(1, "Date is required."),
    startTime: z.string().min(1, "Start time is required."),
    endTime: z.string().min(1, "End time is required."),
    isAvailable: z.enum(["true", "false"]).transform((value) => value === "true"),
  })
  .refine((value) => value.endTime > value.startTime, {
    message: "End time must be after start time.",
    path: ["endTime"],
  });
