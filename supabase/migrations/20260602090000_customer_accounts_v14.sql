create extension if not exists pgcrypto;

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  created_at timestamp with time zone not null default now()
);

create table if not exists public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  label text not null,
  address text not null,
  suburb text not null,
  city text not null,
  access_instructions text,
  gate_code text,
  parking_instructions text,
  is_default boolean not null default false,
  created_at timestamp with time zone not null default now()
);

create table if not exists public.booking_requests (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  request_type text not null,
  requested_date date,
  requested_time time,
  reason text not null,
  request_status text not null default 'Pending',
  admin_notes text,
  created_at timestamp with time zone not null default now(),
  constraint booking_requests_type_check check (
    request_type in ('Reschedule', 'Cancel')
  ),
  constraint booking_requests_status_check check (
    request_status in ('Pending', 'Approved', 'Declined')
  ),
  constraint booking_requests_reschedule_details_check check (
    request_type <> 'Reschedule'
    or (requested_date is not null and requested_time is not null)
  )
);

alter table public.bookings
  add column if not exists customer_id uuid references public.customers(id),
  add column if not exists can_reschedule boolean not null default true,
  add column if not exists can_cancel boolean not null default true;

create index if not exists customers_user_id_idx on public.customers (user_id);
create index if not exists customer_addresses_customer_id_idx
  on public.customer_addresses (customer_id);
create unique index if not exists customer_addresses_default_idx
  on public.customer_addresses (customer_id)
  where is_default = true;
create index if not exists bookings_customer_id_idx
  on public.bookings (customer_id);
create index if not exists booking_requests_booking_id_idx
  on public.booking_requests (booking_id);
create index if not exists booking_requests_customer_id_idx
  on public.booking_requests (customer_id);
create index if not exists booking_requests_status_idx
  on public.booking_requests (request_status);

alter table public.customers enable row level security;
alter table public.customer_addresses enable row level security;
alter table public.booking_requests enable row level security;

drop policy if exists "Customers can view own profile" on public.customers;
create policy "Customers can view own profile"
  on public.customers for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Customers can insert own profile" on public.customers;
create policy "Customers can insert own profile"
  on public.customers for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Customers can update own profile" on public.customers;
create policy "Customers can update own profile"
  on public.customers for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Customers can view own addresses" on public.customer_addresses;
create policy "Customers can view own addresses"
  on public.customer_addresses for select
  to authenticated
  using (
    exists (
      select 1 from public.customers
      where customers.id = customer_addresses.customer_id
        and customers.user_id = auth.uid()
    )
  );

drop policy if exists "Customers can insert own addresses" on public.customer_addresses;
create policy "Customers can insert own addresses"
  on public.customer_addresses for insert
  to authenticated
  with check (
    exists (
      select 1 from public.customers
      where customers.id = customer_addresses.customer_id
        and customers.user_id = auth.uid()
    )
  );

drop policy if exists "Customers can update own addresses" on public.customer_addresses;
create policy "Customers can update own addresses"
  on public.customer_addresses for update
  to authenticated
  using (
    exists (
      select 1 from public.customers
      where customers.id = customer_addresses.customer_id
        and customers.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.customers
      where customers.id = customer_addresses.customer_id
        and customers.user_id = auth.uid()
    )
  );

drop policy if exists "Customers can delete own addresses" on public.customer_addresses;
create policy "Customers can delete own addresses"
  on public.customer_addresses for delete
  to authenticated
  using (
    exists (
      select 1 from public.customers
      where customers.id = customer_addresses.customer_id
        and customers.user_id = auth.uid()
    )
  );

drop policy if exists "Customers can view own bookings" on public.bookings;
create policy "Customers can view own bookings"
  on public.bookings for select
  to authenticated
  using (
    exists (
      select 1 from public.customers
      where customers.id = bookings.customer_id
        and customers.user_id = auth.uid()
    )
  );

drop policy if exists "Customers can view own booking requests" on public.booking_requests;
create policy "Customers can view own booking requests"
  on public.booking_requests for select
  to authenticated
  using (
    exists (
      select 1 from public.customers
      where customers.id = booking_requests.customer_id
        and customers.user_id = auth.uid()
    )
  );

drop policy if exists "Customers can create own booking requests" on public.booking_requests;
create policy "Customers can create own booking requests"
  on public.booking_requests for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.customers
      join public.bookings on bookings.customer_id = customers.id
      where customers.id = booking_requests.customer_id
        and bookings.id = booking_requests.booking_id
        and customers.user_id = auth.uid()
    )
  );

create or replace function public.set_single_default_customer_address()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_default then
    update public.customer_addresses
    set is_default = false
    where customer_id = new.customer_id
      and id <> new.id;
  end if;

  return new;
end;
$$;

drop trigger if exists set_single_default_customer_address_trigger
  on public.customer_addresses;
create trigger set_single_default_customer_address_trigger
  before insert or update of is_default on public.customer_addresses
  for each row
  execute function public.set_single_default_customer_address();

create or replace function public.handle_new_customer_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.customers (user_id, full_name, email, phone)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1)),
    coalesce(new.email, ''),
    nullif(new.raw_user_meta_data ->> 'phone', '')
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_create_customer on auth.users;
create trigger on_auth_user_created_create_customer
  after insert on auth.users
  for each row
  execute function public.handle_new_customer_user();

notify pgrst, 'reload schema';
