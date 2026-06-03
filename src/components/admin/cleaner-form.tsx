"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { createCleaner, updateCleaner } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  cleanerFormSchema,
  type CleanerFormValues,
} from "@/lib/cleaner-schema";
import { cleanerSpecialties, workingDays, type Cleaner } from "@/lib/types";

type CleanerFormProps = {
  cleaner?: Cleaner;
};

export function CleanerForm({ cleaner }: CleanerFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CleanerFormValues>({
    resolver: zodResolver(cleanerFormSchema),
    defaultValues: {
      fullName: cleaner?.full_name ?? "",
      email: "",
      phone: cleaner?.phone ?? "",
      password: "",
      role: cleaner?.role ?? "Cleaner",
      startedAt: cleaner?.started_at ?? new Date().toISOString().slice(0, 10),
      profilePhoto: cleaner?.profile_photo ?? "",
      bio: cleaner?.bio ?? "",
      specialties: cleaner?.specialties ?? [],
      workingDays:
        cleaner?.working_days ?? [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ],
      workingStartTime: cleaner?.working_start_time?.slice(0, 5) ?? "08:00",
      workingEndTime: cleaner?.working_end_time?.slice(0, 5) ?? "17:00",
      rating: cleaner?.rating ?? 0,
      completedJobs: cleaner?.completed_jobs ?? 0,
      active: cleaner?.active ?? true,
    },
  });

  function onSubmit(values: CleanerFormValues) {
    setError(null);
    startTransition(async () => {
      try {
        const result = cleaner
          ? await updateCleaner(cleaner.id, values)
          : await createCleaner(values);

        router.push(`/admin/cleaners/${result.id}`);
      } catch (submissionError) {
        setError(
          submissionError instanceof Error
            ? submissionError.message
            : "Cleaner could not be saved."
        );
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Full Name" error={errors.fullName?.message}>
          <Input {...register("fullName")} autoComplete="name" />
        </Field>
        <Field label="Phone" error={errors.phone?.message}>
          <Input
            {...register("phone")}
            autoComplete="tel"
            inputMode="tel"
            placeholder="0792022648"
          />
        </Field>
        {cleaner?.email ? (
          <div className="grid gap-2 rounded-lg border bg-background p-3 text-sm">
            <span className="font-medium">Auth email</span>
            <span className="font-mono text-muted-foreground">{cleaner.email}</span>
          </div>
        ) : null}
        <Field
          label={cleaner ? "Reset password" : "Temporary password"}
          error={errors.password?.message}
        >
          <Input
            {...register("password")}
            type="password"
            autoComplete="new-password"
            placeholder={cleaner ? "Leave blank to keep current password" : ""}
          />
        </Field>
        <Field label="Role" error={errors.role?.message}>
          <select
            {...register("role")}
            className="h-9 rounded-lg border bg-background px-3 text-sm"
          >
            <option value="Cleaner">Cleaner</option>
            <option value="Team Leader">Team Leader</option>
          </select>
        </Field>
        <Field label="Start Date" error={errors.startedAt?.message}>
          <Input {...register("startedAt")} type="date" />
        </Field>
        <Field label="Profile Photo" error={errors.profilePhoto?.message}>
          <Input
            {...register("profilePhoto")}
            placeholder="https://example.com/photo.jpg"
          />
        </Field>
        <Field label="Rating" error={errors.rating?.message}>
          <Input
            {...register("rating", { valueAsNumber: true })}
            type="number"
            min="0"
            max="5"
            step="0.1"
          />
        </Field>
        <Field label="Completed Jobs" error={errors.completedJobs?.message}>
          <Input
            {...register("completedJobs", { valueAsNumber: true })}
            type="number"
            min="0"
            step="1"
          />
        </Field>
      </div>

      <Field label="Bio" error={errors.bio?.message}>
        <Textarea {...register("bio")} rows={5} />
      </Field>

      <div className="grid gap-3">
        <Label>Specialties</Label>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {cleanerSpecialties.map((specialty) => (
            <label
              key={specialty}
              className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm"
            >
              <input
                {...register("specialties")}
                type="checkbox"
                value={specialty}
                className="size-4 accent-primary"
              />
              {specialty}
            </label>
          ))}
        </div>
        {errors.specialties?.message ? (
          <p className="text-sm text-destructive">
            {errors.specialties.message}
          </p>
        ) : null}
      </div>

      <div className="grid gap-3">
        <Label>Working Days</Label>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {workingDays.map((day) => (
            <label
              key={day}
              className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm"
            >
              <input
                {...register("workingDays")}
                type="checkbox"
                value={day}
                className="size-4 accent-primary"
              />
              {day}
            </label>
          ))}
        </div>
        {errors.workingDays?.message ? (
          <p className="text-sm text-destructive">
            {errors.workingDays.message}
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="Working Start Time"
          error={errors.workingStartTime?.message}
        >
          <Input {...register("workingStartTime")} type="time" />
        </Field>
        <Field label="Working End Time" error={errors.workingEndTime?.message}>
          <Input {...register("workingEndTime")} type="time" />
        </Field>
      </div>

      <label className="flex w-fit items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm">
        <input
          {...register("active")}
          type="checkbox"
          className="size-4 accent-primary"
        />
        Active Status
      </label>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving" : "Save cleaner"}
        </Button>
      </div>
    </form>
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
    <div className="grid gap-2">
      <Label>{label}</Label>
      {children}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
