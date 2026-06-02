create extension if not exists pgcrypto;

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text not null default '',
  base_price decimal(10, 2) not null,
  duration_minutes integer not null,
  active boolean not null default true,
  created_at timestamp with time zone not null default now()
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  booking_reference text not null default (
    'SHL-' || upper(substr(md5(gen_random_uuid()::text), 1, 10))
  ),
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  service_id uuid not null references public.services(id),
  address text not null,
  suburb text not null,
  city text not null,
  booking_date date not null,
  booking_time time not null,
  notes text,
  service_data jsonb not null default '{}'::jsonb,
  selected_addons jsonb not null default '[]'::jsonb,
  estimated_price decimal(10, 2) not null,
  status text not null default 'Pending',
  created_at timestamp with time zone not null default now(),
  constraint bookings_status_check check (
    status in ('Pending', 'Confirmed', 'Completed', 'Cancelled')
  )
);

-- If the V1.0 table already exists, CREATE TABLE IF NOT EXISTS will not add
-- new V1.1 columns. Add every required column before creating indexes.
alter table public.bookings
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists booking_reference text not null default (
    'SHL-' || upper(substr(md5(gen_random_uuid()::text), 1, 10))
  ),
  add column if not exists customer_name text,
  add column if not exists customer_email text,
  add column if not exists customer_phone text,
  add column if not exists service_id uuid,
  add column if not exists address text,
  add column if not exists suburb text,
  add column if not exists city text,
  add column if not exists booking_date date,
  add column if not exists booking_time time,
  add column if not exists notes text,
  add column if not exists service_data jsonb not null default '{}'::jsonb,
  add column if not exists selected_addons jsonb not null default '[]'::jsonb,
  add column if not exists estimated_price decimal(10, 2),
  add column if not exists status text not null default 'Pending',
  add column if not exists created_at timestamp with time zone not null default now();

do $$
begin
  update public.bookings
  set id = gen_random_uuid()
  where id is null;

  update public.bookings
  set booking_reference = 'SHL-' || upper(substr(md5(id::text || clock_timestamp()::text), 1, 10))
  where booking_reference is null
    or booking_reference = '';

  update public.bookings b
  set booking_reference = 'SHL-' || upper(substr(md5(b.id::text || b.ctid::text || clock_timestamp()::text), 1, 10))
  where exists (
    select 1
    from public.bookings other
    where other.booking_reference = b.booking_reference
      and other.ctid <> b.ctid
  );

  if not exists (
    select 1
    from pg_constraint
    where conname = 'bookings_service_id_fkey'
      and conrelid = 'public.bookings'::regclass
  ) then
    alter table public.bookings
      add constraint bookings_service_id_fkey
      foreign key (service_id)
      references public.services(id)
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'bookings_status_check'
      and conrelid = 'public.bookings'::regclass
  ) then
    alter table public.bookings
      add constraint bookings_status_check
      check (status in ('Pending', 'Confirmed', 'Completed', 'Cancelled'))
      not valid;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'bookings'
      and column_name = 'bedrooms'
  ) then
    alter table public.bookings alter column bedrooms drop not null;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'bookings'
      and column_name = 'bathrooms'
  ) then
    alter table public.bookings alter column bathrooms drop not null;
  end if;
end $$;

create index if not exists bookings_created_at_idx on public.bookings (created_at desc);
create index if not exists bookings_status_idx on public.bookings (status);
create index if not exists bookings_service_id_idx on public.bookings (service_id);
create unique index if not exists bookings_booking_reference_idx
  on public.bookings (booking_reference);

alter table public.services enable row level security;
alter table public.bookings enable row level security;

insert into public.services (name, description, base_price, duration_minutes, active)
values
  ('Regular Cleaning', 'A reliable home clean for weekly or once-off refreshes.', 650.00, 180, true),
  ('Airbnb Cleaning', 'A guest-ready turnover clean for short-stay properties.', 850.00, 210, true),
  ('Office Cleaning', 'A tidy, professional clean for small offices and workspaces.', 900.00, 240, true),
  ('Carpet Cleaning', 'Focused carpet cleaning for rooms, rugs, stains, and odours.', 750.00, 180, true),
  ('Moving Cleaning', 'A thorough clean before moving in or after moving out.', 1500.00, 360, true),
  ('Deep Cleaning', 'A detailed clean for kitchens, bathrooms, and hard-to-reach spaces.', 1200.00, 300, true)
on conflict (name) do update set
  description = excluded.description,
  base_price = excluded.base_price,
  duration_minutes = excluded.duration_minutes,
  active = excluded.active;
