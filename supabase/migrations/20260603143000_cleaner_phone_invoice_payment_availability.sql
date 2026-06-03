alter table public.invoices
  add column if not exists payment_reference text,
  add column if not exists paystack_reference text;

create unique index if not exists invoices_payment_reference_idx
  on public.invoices (payment_reference)
  where payment_reference is not null;

create index if not exists invoices_paystack_reference_idx
  on public.invoices (paystack_reference)
  where paystack_reference is not null;

update public.cleaners
set phone = regexp_replace(phone, '[^0-9+]', '', 'g')
where phone is not null;

update public.cleaners
set phone = case
  when phone ~ '^\+27[0-9]{9}$' then '0' || substring(phone from 4)
  when phone ~ '^27[0-9]{9}$' then '0' || substring(phone from 3)
  else phone
end;

update public.cleaners
set email = lower(phone || '@shalean.co.za')
where phone ~ '^0[0-9]{9}$';

create unique index if not exists cleaners_phone_unique_idx
  on public.cleaners (phone);

create unique index if not exists cleaners_email_lower_unique_idx
  on public.cleaners (lower(email));

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'cleaners_phone_format_check'
      and conrelid = 'public.cleaners'::regclass
  ) then
    alter table public.cleaners
      add constraint cleaners_phone_format_check
      check (phone ~ '^0[0-9]{9}$')
      not valid;
  end if;
end $$;

create or replace function public.prevent_cleaner_same_date_double_booking()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_date date;
begin
  if new.assignment_status = 'Cancelled' then
    return new;
  end if;

  select booking_date into target_date
  from public.bookings
  where id = new.booking_id;

  if exists (
    select 1
    from public.booking_assignments existing
    join public.bookings existing_booking
      on existing_booking.id = existing.booking_id
    where existing.cleaner_id = new.cleaner_id
      and existing.assignment_status <> 'Cancelled'
      and existing.booking_id <> new.booking_id
      and existing_booking.booking_date = target_date
      and existing_booking.status <> 'Cancelled'
  ) then
    raise exception 'Cleaner already has a booking on this date.';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_cleaner_same_date_double_booking_trigger
  on public.booking_assignments;

create trigger prevent_cleaner_same_date_double_booking_trigger
before insert or update on public.booking_assignments
for each row execute function public.prevent_cleaner_same_date_double_booking();

notify pgrst, 'reload schema';
