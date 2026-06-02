export function formatDateTime(date: string, time?: string | null) {
  const value = time ? `${date}T${time.slice(0, 5)}:00` : date;

  return new Intl.DateTimeFormat("en-ZA", {
    dateStyle: "medium",
    timeStyle: time ? "short" : undefined,
  }).format(new Date(value));
}

export function formatTimestamp(value: string | null | undefined) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-ZA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatNumber(value: number, maximumFractionDigits = 0) {
  return new Intl.NumberFormat("en-ZA", {
    maximumFractionDigits,
  }).format(value);
}
