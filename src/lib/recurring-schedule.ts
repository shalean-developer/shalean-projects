import type { RecurringFrequency } from "@/lib/types";

export const recurringDays = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export type RecurringDay = (typeof recurringDays)[number];

export const recurringFrequencyOptions = [
  "Weekly",
  "Bi-weekly",
  "Monthly",
  "Custom days",
] as const satisfies RecurringFrequency[];

export function normalizeRecurringFrequency(
  value: unknown
): RecurringFrequency | null {
  const frequency = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");

  if (frequency === "weekly") {
    return "Weekly";
  }

  if (frequency === "bi-weekly" || frequency === "biweekly") {
    return "Bi-weekly";
  }

  if (frequency === "monthly") {
    return "Monthly";
  }

  if (frequency === "customdays" || frequency === "custom") {
    return "Custom days";
  }

  return null;
}

export function normalisePreferredDays(days: unknown): RecurringDay[] {
  const values = Array.isArray(days)
    ? days
    : String(days ?? "")
        .split(",")
        .map((day) => day.trim());
  const selected = new Set<RecurringDay>();

  for (const day of values) {
    const matched = recurringDays.find(
      (knownDay) => knownDay.toLowerCase() === String(day).toLowerCase()
    );

    if (matched) {
      selected.add(matched);
    }
  }

  return recurringDays.filter((day) => selected.has(day));
}

export function formatPreferredDays(days: unknown) {
  const selectedDays = normalisePreferredDays(days);
  return selectedDays.length ? selectedDays.join(", ") : "Monday";
}

export function weekdayNameFromDate(dateInput: string): RecurringDay {
  const dayIndex = new Date(`${dateInput}T00:00:00`).getDay();
  return recurringDays[(dayIndex + 6) % 7];
}

export function getFirstRecurringDate(
  dateInput: string,
  frequency: RecurringFrequency,
  preferredDay: string
) {
  if (frequency !== "Weekly" && frequency !== "Custom days") {
    return dateInput;
  }

  const selectedDays = normalisePreferredDays(preferredDay);

  if (!selectedDays.length) {
    return dateInput;
  }

  const date = new Date(`${dateInput}T00:00:00`);

  for (let offset = 0; offset <= 6; offset += 1) {
    const candidate = addDays(date, offset);
    if (selectedDays.includes(weekdayNameFromDate(toDateInput(candidate)))) {
      return toDateInput(candidate);
    }
  }

  return dateInput;
}

export function getNextRecurringDate(
  dateInput: string,
  frequency: RecurringFrequency,
  preferredDay: string
) {
  const date = new Date(`${dateInput}T00:00:00`);

  if (frequency === "Weekly" || frequency === "Custom days") {
    const selectedDays = normalisePreferredDays(preferredDay);

    if (selectedDays.length > 1 || frequency === "Custom days") {
      for (let offset = 1; offset <= 7; offset += 1) {
        const candidate = addDays(date, offset);
        if (selectedDays.includes(weekdayNameFromDate(toDateInput(candidate)))) {
          return toDateInput(candidate);
        }
      }
    }

    return toDateInput(addDays(date, 7));
  }

  if (frequency === "Bi-weekly") {
    return toDateInput(addDays(date, 14));
  }

  const next = new Date(date);
  next.setMonth(next.getMonth() + 1);
  return toDateInput(next);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}
