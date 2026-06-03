drop index if exists public.payroll_records_booking_cleaner_idx;
drop index if exists public.cleaner_earnings_booking_cleaner_idx;

create unique index if not exists payroll_records_booking_cleaner_idx
  on public.payroll_records (booking_id, cleaner_id);

create unique index if not exists cleaner_earnings_booking_cleaner_idx
  on public.cleaner_earnings (booking_id, cleaner_id);
