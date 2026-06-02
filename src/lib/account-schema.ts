import { z } from "zod";

export const authSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

export const signupSchema = authSchema.extend({
  fullName: z.string().min(2, "Enter your full name."),
  phone: z.string().min(7, "Enter a valid phone number."),
});

export const profileSchema = z.object({
  fullName: z.string().min(2, "Enter your full name."),
  phone: z.string().min(7, "Enter a valid phone number."),
});

export const addressSchema = z.object({
  label: z.string().min(2, "Add a label for this address."),
  address: z.string().min(3, "Enter the street address."),
  suburb: z.string().min(2, "Enter the suburb."),
  city: z.string().min(2, "Enter the city."),
  accessInstructions: z.string().optional(),
  gateCode: z.string().optional(),
  parkingInstructions: z.string().optional(),
  isDefault: z.boolean(),
});

export const bookingRequestSchema = z
  .object({
    bookingId: z.string().uuid("Invalid booking."),
    requestType: z.enum(["Reschedule", "Cancel"]),
    requestedDate: z.string().optional(),
    requestedTime: z.string().optional(),
    reason: z.string().min(5, "Please add a little more detail."),
  })
  .superRefine((values, ctx) => {
    if (values.requestType !== "Reschedule") {
      return;
    }

    if (!values.requestedDate) {
      ctx.addIssue({
        code: "custom",
        path: ["requestedDate"],
        message: "Choose a preferred date.",
      });
    }

    if (!values.requestedTime) {
      ctx.addIssue({
        code: "custom",
        path: ["requestedTime"],
        message: "Choose a preferred time.",
      });
    }
  });

export const adminRequestDecisionSchema = z.object({
  requestId: z.string().uuid("Invalid request."),
  decision: z.enum(["Approved", "Declined"]),
  adminNotes: z.string().optional(),
});

export type AuthValues = z.infer<typeof authSchema>;
export type SignupValues = z.infer<typeof signupSchema>;
export type ProfileValues = z.infer<typeof profileSchema>;
export type AddressValues = z.infer<typeof addressSchema>;
export type BookingRequestValues = z.infer<typeof bookingRequestSchema>;
