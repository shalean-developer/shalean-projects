create extension if not exists pgcrypto;

alter table public.bookings
  add column if not exists payment_status text not null default 'Pending Payment',
  add column if not exists payment_type text,
  add column if not exists total_amount decimal(10, 2),
  add column if not exists amount_paid decimal(10, 2) not null default 0,
  add column if not exists balance_due decimal(10, 2),
  add column if not exists confirmed_at timestamp with time zone;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'bookings_status_check'
      and conrelid = 'public.bookings'::regclass
  ) then
    alter table public.bookings drop constraint bookings_status_check;
  end if;
end $$;

update public.bookings
set
  status = case when status = 'Pending' then 'Pending Payment' else status end,
  total_amount = coalesce(total_amount, estimated_price, 0),
  balance_due = coalesce(balance_due, estimated_price, 0),
  payment_status = coalesce(nullif(payment_status, ''), 'Pending Payment')
where status = 'Pending'
   or total_amount is null
   or balance_due is null
   or payment_status is null
   or payment_status = '';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'bookings_status_check'
      and conrelid = 'public.bookings'::regclass
  ) then
    alter table public.bookings
      add constraint bookings_status_check
      check (status in ('Pending Payment', 'Confirmed', 'Completed', 'Cancelled'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'bookings_payment_status_check'
      and conrelid = 'public.bookings'::regclass
  ) then
    alter table public.bookings
      add constraint bookings_payment_status_check
      check (
        payment_status in (
          'Pending Payment',
          'Deposit Paid',
          'Paid',
          'Failed',
          'Refunded'
        )
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'bookings_payment_type_check'
      and conrelid = 'public.bookings'::regclass
  ) then
    alter table public.bookings
      add constraint bookings_payment_type_check
      check (payment_type is null or payment_type in ('Deposit', 'Full Payment'));
  end if;
end $$;

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  payment_reference text not null unique,
  paystack_reference text,
  payment_type text not null,
  amount_due decimal(10, 2) not null,
  amount_paid decimal(10, 2) not null default 0,
  currency text not null default 'ZAR',
  payment_status text not null default 'Pending Payment',
  payment_method text,
  paid_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  constraint payments_payment_type_check check (
    payment_type in ('Deposit', 'Full Payment')
  ),
  constraint payments_payment_status_check check (
    payment_status in (
      'Pending Payment',
      'Deposit Paid',
      'Paid',
      'Failed',
      'Refunded'
    )
  )
);

create index if not exists payments_booking_id_idx on public.payments (booking_id);
create index if not exists payments_paystack_reference_idx
  on public.payments (paystack_reference);
create index if not exists payments_payment_status_idx
  on public.payments (payment_status);
create index if not exists bookings_payment_status_idx
  on public.bookings (payment_status);
create index if not exists bookings_payment_type_idx
  on public.bookings (payment_type);

alter table public.payments enable row level security;

notify pgrst, 'reload schema';
