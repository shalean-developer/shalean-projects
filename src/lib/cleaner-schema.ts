import { z } from "zod";

import { isValidSouthAfricanPhone } from "@/lib/phone-auth";
import { cleanerSpecialties, workingDays } from "@/lib/types";

export const cleanerFormSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is required."),
  email: z.string().optional(),
  phone: z
    .string()
    .trim()
    .refine(isValidSouthAfricanPhone, "Enter a valid South African phone number."),
  password: z
    .string()
    .optional()
    .refine(
      (value) => !value || value.length >= 6,
      "Password must be at least 6 characters."
    ),
  role: z.enum(["Cleaner", "Team Leader"]),
  startedAt: z.string().min(1, "Start date is required."),
  profilePhoto: z.string().trim(),
  bio: z.string().trim(),
  specialties: z
    .array(z.enum(cleanerSpecialties))
    .min(1, "Select at least one specialty."),
  workingDays: z
    .array(z.enum(workingDays))
    .min(1, "Select at least one working day."),
  workingStartTime: z.string().min(1, "Working start time is required."),
  workingEndTime: z.string().min(1, "Working end time is required."),
  rating: z.number().min(0).max(5),
  completedJobs: z.number().int().min(0),
  active: z.boolean(),
}).refine((value) => value.workingEndTime > value.workingStartTime, {
  message: "Working end time must be after start time.",
  path: ["workingEndTime"],
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

export const leaveRequestSchema = z
  .object({
    cleanerId: z.uuid(),
    requestType: z.enum(["Leave", "Sick Leave"]),
    startDate: z.string().min(1, "Start date is required."),
    endDate: z.string().min(1, "End date is required."),
    reason: z.string().trim().min(5, "Please add a reason."),
  })
  .refine((value) => value.endDate >= value.startDate, {
    message: "End date must be on or after start date.",
    path: ["endDate"],
  });

export const leaveDecisionSchema = z.object({
  leaveRequestId: z.uuid(),
  status: z.enum(["Approved", "Rejected"]),
  adminNotes: z.string().optional(),
});
