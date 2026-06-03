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

  if exists (
    select 1
    from pg_constraint
    where conname = 'booking_assignments_status_check'
      and conrelid = 'public.booking_assignments'::regclass
  ) then
    alter table public.booking_assignments drop constraint booking_assignments_status_check;
  end if;

  if exists (
    select 1
    from pg_constraint
    where conname = 'invoices_booking_id_fkey'
      and conrelid = 'public.invoices'::regclass
  ) then
    alter table public.invoices drop constraint invoices_booking_id_fkey;
  end if;

  if exists (
    select 1
    from pg_constraint
    where conname = 'invoices_booking_unique'
      and conrelid = 'public.invoices'::regclass
  ) then
    alter table public.invoices drop constraint invoices_booking_unique;
  end if;
end $$;

alter table public.bookings
  add column if not exists number_of_cleaners integer not null default 1,
  add column if not exists admin_created boolean not null default false,
  add column if not exists draft_locked_at timestamp with time zone;

alter table public.bookings
  add constraint bookings_status_check
  check (
    status in (
      'Draft',
      'Pending Invoice',
      'Invoiced',
      'Paid',
      'Pending Payment',
      'Pending Confirmation',
      'Confirmed',
      'Completed',
      'Cancelled'
    )
  );

alter table public.bookings
  add constraint bookings_number_of_cleaners_check
  check (number_of_cleaners between 1 and 5) not valid;

alter table public.booking_assignments
  add column if not exists is_team_leader boolean not null default false;

alter table public.booking_assignments
  add constraint booking_assignments_status_check
  check (assignment_status in ('Assigned', 'Reassigned', 'Cancelled'));

create unique index if not exists booking_assignments_active_booking_cleaner_idx
  on public.booking_assignments (booking_id, cleaner_id)
  where assignment_status <> 'Cancelled';

create unique index if not exists booking_assignments_one_leader_idx
  on public.booking_assignments (booking_id)
  where assignment_status <> 'Cancelled'
    and is_team_leader = true;

alter table public.invoices
  alter column booking_id drop not null,
  add column if not exists due_date date,
  add column if not exists payment_link text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'invoices_booking_id_fkey'
      and conrelid = 'public.invoices'::regclass
  ) then
    alter table public.invoices
      add constraint invoices_booking_id_fkey
      foreign key (booking_id)
      references public.bookings(id)
      on delete cascade
      not valid;
  end if;
end $$;

create unique index if not exists invoices_booking_unique
  on public.invoices (booking_id)
  where booking_id is not null;

create table if not exists public.invoice_line_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  description text not null,
  service_type text not null,
  booking_date date not null,
  amount decimal(10, 2) not null,
  created_at timestamp with time zone not null default now(),
  constraint invoice_line_items_amount_check check (amount >= 0),
  constraint invoice_line_items_invoice_booking_unique unique (invoice_id, booking_id)
);

create index if not exists bookings_customer_status_date_idx
  on public.bookings (customer_id, status, booking_date);
create index if not exists invoice_line_items_invoice_id_idx
  on public.invoice_line_items (invoice_id);
create index if not exists invoice_line_items_booking_id_idx
  on public.invoice_line_items (booking_id);

alter table public.invoice_line_items enable row level security;

grant select, insert, update, delete on table public.invoice_line_items to authenticated;
grant select on table public.invoice_line_items to anon;

drop policy if exists "Cleaners can view assigned bookings" on public.bookings;
create policy "Cleaners can view assigned bookings"
  on public.bookings for select
  to authenticated
  using (
    exists (
      select 1
      from public.cleaners
      join public.booking_assignments
        on booking_assignments.cleaner_id = cleaners.id
      where cleaners.user_id = auth.uid()
        and booking_assignments.booking_id = bookings.id
        and booking_assignments.assignment_status <> 'Cancelled'
    )
  );

drop policy if exists "Cleaners can update assigned job status" on public.bookings;
create policy "Cleaners can update assigned job status"
  on public.bookings for update
  to authenticated
  using (
    exists (
      select 1
      from public.cleaners
      join public.booking_assignments
        on booking_assignments.cleaner_id = cleaners.id
      where cleaners.user_id = auth.uid()
        and booking_assignments.booking_id = bookings.id
        and booking_assignments.assignment_status <> 'Cancelled'
    )
  )
  with check (
    exists (
      select 1
      from public.cleaners
      join public.booking_assignments
        on booking_assignments.cleaner_id = cleaners.id
      where cleaners.user_id = auth.uid()
        and booking_assignments.booking_id = bookings.id
        and booking_assignments.assignment_status <> 'Cancelled'
    )
  );

drop policy if exists "Customers can view invoice line items" on public.invoice_line_items;
create policy "Customers can view invoice line items"
  on public.invoice_line_items for select
  to authenticated
  using (
    exists (
      select 1
      from public.invoices
      join public.customers on customers.id = invoices.customer_id
      where invoices.id = invoice_line_items.invoice_id
        and customers.user_id = auth.uid()
    )
  );

drop policy if exists "Admins can manage invoice line items" on public.invoice_line_items;
create policy "Admins can manage invoice line items"
  on public.invoice_line_items for all
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

notify pgrst, 'reload schema';
