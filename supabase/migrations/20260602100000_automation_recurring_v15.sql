create extension if not exists pgcrypto;

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

alter table public.bookings
  add column if not exists recurring_booking_id uuid;

alter table public.bookings
  add constraint bookings_status_check
  check (
    status in (
      'Pending Payment',
      'Pending Confirmation',
      'Confirmed',
      'Completed',
      'Cancelled'
    )
  );

create table if not exists public.recurring_bookings (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  service_id uuid not null references public.services(id),
  address_id uuid references public.customer_addresses(id) on delete set null,
  frequency text not null,
  preferred_day text not null,
  preferred_time time not null,
  service_data jsonb not null default '{}'::jsonb,
  selected_addons jsonb not null default '[]'::jsonb,
  estimated_price decimal(10, 2) not null,
  status text not null default 'Active',
  next_booking_date date not null,
  created_at timestamp with time zone not null default now(),
  constraint recurring_bookings_frequency_check check (
    frequency in ('Weekly', 'Bi-weekly', 'Monthly')
  ),
  constraint recurring_bookings_status_check check (
    status in ('Active', 'Paused', 'Cancelled')
  ),
  constraint recurring_bookings_selected_addons_array_check check (
    jsonb_typeof(selected_addons) = 'array'
  )
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'bookings_recurring_booking_id_fkey'
      and conrelid = 'public.bookings'::regclass
  ) then
    alter table public.bookings
      add constraint bookings_recurring_booking_id_fkey
      foreign key (recurring_booking_id)
      references public.recurring_bookings(id)
      on delete set null
      not valid;
  end if;
end $$;

create table if not exists public.automation_logs (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id) on delete set null,
  customer_id uuid references public.customers(id) on delete cascade,
  automation_type text not null,
  channel text not null,
  status text not null,
  sent_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  constraint automation_logs_type_check check (
    automation_type in (
      'Booking Reminder',
      'Cleaner Reminder',
      'Payment Reminder',
      'Post-Cleaning Follow-Up',
      'Review Request',
      'Invoice Sent'
    )
  ),
  constraint automation_logs_channel_check check (
    channel in ('Email', 'WhatsApp')
  )
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  rating integer not null,
  review_text text not null,
  public boolean not null default false,
  created_at timestamp with time zone not null default now(),
  constraint reviews_rating_check check (rating between 1 and 5),
  constraint reviews_booking_customer_unique unique (booking_id, customer_id)
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  invoice_number text not null unique,
  invoice_status text not null default 'Draft',
  subtotal decimal(10, 2) not null,
  total decimal(10, 2) not null,
  amount_paid decimal(10, 2) not null default 0,
  balance_due decimal(10, 2) not null default 0,
  issued_at timestamp with time zone,
  paid_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  constraint invoices_status_check check (
    invoice_status in ('Draft', 'Sent', 'Paid', 'Partially Paid', 'Cancelled')
  ),
  constraint invoices_booking_unique unique (booking_id)
);

create table if not exists public.recurring_plan_change_requests (
  id uuid primary key default gen_random_uuid(),
  recurring_booking_id uuid not null references public.recurring_bookings(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  requested_changes text not null,
  request_status text not null default 'Pending',
  admin_notes text,
  created_at timestamp with time zone not null default now(),
  constraint recurring_plan_change_requests_status_check check (
    request_status in ('Pending', 'Approved', 'Declined')
  )
);

create index if not exists recurring_bookings_customer_id_idx
  on public.recurring_bookings (customer_id);
create index if not exists recurring_bookings_status_next_date_idx
  on public.recurring_bookings (status, next_booking_date);
create index if not exists bookings_recurring_booking_id_idx
  on public.bookings (recurring_booking_id);
create index if not exists automation_logs_booking_type_idx
  on public.automation_logs (booking_id, automation_type);
create index if not exists automation_logs_customer_id_idx
  on public.automation_logs (customer_id);
create index if not exists automation_logs_created_at_idx
  on public.automation_logs (created_at desc);
create index if not exists reviews_customer_id_idx on public.reviews (customer_id);
create index if not exists reviews_public_idx on public.reviews (public);
create index if not exists invoices_customer_id_idx on public.invoices (customer_id);
create index if not exists invoices_status_idx on public.invoices (invoice_status);
create index if not exists recurring_plan_change_requests_recurring_id_idx
  on public.recurring_plan_change_requests (recurring_booking_id);

alter table public.recurring_bookings enable row level security;
alter table public.automation_logs enable row level security;
alter table public.reviews enable row level security;
alter table public.invoices enable row level security;
alter table public.recurring_plan_change_requests enable row level security;

drop policy if exists "Customers can view own recurring bookings" on public.recurring_bookings;
create policy "Customers can view own recurring bookings"
  on public.recurring_bookings for select
  to authenticated
  using (
    exists (
      select 1 from public.customers
      where customers.id = recurring_bookings.customer_id
        and customers.user_id = auth.uid()
    )
  );

drop policy if exists "Customers can create own recurring bookings" on public.recurring_bookings;
create policy "Customers can create own recurring bookings"
  on public.recurring_bookings for insert
  to authenticated
  with check (
    exists (
      select 1 from public.customers
      where customers.id = recurring_bookings.customer_id
        and customers.user_id = auth.uid()
    )
  );

drop policy if exists "Customers can update own recurring bookings" on public.recurring_bookings;
create policy "Customers can update own recurring bookings"
  on public.recurring_bookings for update
  to authenticated
  using (
    exists (
      select 1 from public.customers
      where customers.id = recurring_bookings.customer_id
        and customers.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.customers
      where customers.id = recurring_bookings.customer_id
        and customers.user_id = auth.uid()
    )
  );

drop policy if exists "Customers can view own automation logs" on public.automation_logs;
create policy "Customers can view own automation logs"
  on public.automation_logs for select
  to authenticated
  using (
    exists (
      select 1 from public.customers
      where customers.id = automation_logs.customer_id
        and customers.user_id = auth.uid()
    )
  );

drop policy if exists "Customers can view own reviews" on public.reviews;
create policy "Customers can view own reviews"
  on public.reviews for select
  to authenticated
  using (
    exists (
      select 1 from public.customers
      where customers.id = reviews.customer_id
        and customers.user_id = auth.uid()
    )
  );

drop policy if exists "Customers can create own reviews" on public.reviews;
create policy "Customers can create own reviews"
  on public.reviews for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.customers
      join public.bookings on bookings.customer_id = customers.id
      where customers.id = reviews.customer_id
        and bookings.id = reviews.booking_id
        and bookings.status = 'Completed'
        and customers.user_id = auth.uid()
    )
  );

drop policy if exists "Customers can view public reviews" on public.reviews;
create policy "Customers can view public reviews"
  on public.reviews for select
  to anon, authenticated
  using (public = true);

drop policy if exists "Customers can view own invoices" on public.invoices;
create policy "Customers can view own invoices"
  on public.invoices for select
  to authenticated
  using (
    exists (
      select 1 from public.customers
      where customers.id = invoices.customer_id
        and customers.user_id = auth.uid()
    )
  );

drop policy if exists "Customers can view own recurring change requests"
  on public.recurring_plan_change_requests;
create policy "Customers can view own recurring change requests"
  on public.recurring_plan_change_requests for select
  to authenticated
  using (
    exists (
      select 1 from public.customers
      where customers.id = recurring_plan_change_requests.customer_id
        and customers.user_id = auth.uid()
    )
  );

drop policy if exists "Customers can create own recurring change requests"
  on public.recurring_plan_change_requests;
create policy "Customers can create own recurring change requests"
  on public.recurring_plan_change_requests for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.customers
      join public.recurring_bookings on recurring_bookings.customer_id = customers.id
      where customers.id = recurring_plan_change_requests.customer_id
        and recurring_bookings.id = recurring_plan_change_requests.recurring_booking_id
        and customers.user_id = auth.uid()
    )
  );

create or replace function public.next_invoice_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  next_number integer;
begin
  select coalesce(max((regexp_match(invoice_number, '^INV-([0-9]+)$'))[1]::integer), 0) + 1
  into next_number
  from public.invoices
  where invoice_number ~ '^INV-[0-9]+$';

  return 'INV-' || lpad(next_number::text, 6, '0');
end;
$$;

notify pgrst, 'reload schema';
