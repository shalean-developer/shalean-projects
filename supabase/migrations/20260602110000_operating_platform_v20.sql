create extension if not exists pgcrypto;

create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
set search_path = public
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin';
$$;

alter table public.cleaners
  add column if not exists user_id uuid unique references auth.users(id) on delete set null;

create or replace function public.is_cleaner_user(cleaner_uuid uuid)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.cleaners
    where cleaners.id = cleaner_uuid
      and (
        cleaners.user_id = auth.uid()
        or lower(cleaners.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
  );
$$;

alter table public.bookings
  add column if not exists scheduled_start_time timestamp with time zone,
  add column if not exists scheduled_end_time timestamp with time zone,
  add column if not exists completed_at timestamp with time zone,
  add column if not exists cancelled_at timestamp with time zone,
  add column if not exists cancellation_reason text;

update public.bookings
set scheduled_start_time = (booking_date::timestamp + booking_time),
    scheduled_end_time = (booking_date::timestamp + booking_time + interval '3 hours')
where scheduled_start_time is null
  and booking_date is not null
  and booking_time is not null;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'bookings_job_status_check'
      and conrelid = 'public.bookings'::regclass
  ) then
    alter table public.bookings drop constraint bookings_job_status_check;
  end if;
end $$;

alter table public.bookings
  add constraint bookings_job_status_check
  check (
    job_status in (
      'Not Assigned',
      'Assigned',
      'Accepted',
      'Declined',
      'On The Way',
      'In Progress',
      'Completed',
      'Cancelled'
    )
  );

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete set null,
  booking_id uuid references public.bookings(id) on delete set null,
  subject text not null,
  message text not null,
  status text not null default 'Open',
  priority text not null default 'Medium',
  assigned_admin_id uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint support_tickets_status_check check (
    status in ('Open', 'In Progress', 'Waiting For Customer', 'Resolved', 'Closed')
  ),
  constraint support_tickets_priority_check check (
    priority in ('Low', 'Medium', 'High', 'Urgent')
  )
);

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  sender_id uuid references auth.users(id) on delete set null,
  sender_role text not null,
  message text not null,
  created_at timestamp with time zone not null default now(),
  constraint support_messages_sender_role_check check (
    sender_role in ('customer', 'cleaner', 'admin')
  )
);

create table if not exists public.payroll_records (
  id uuid primary key default gen_random_uuid(),
  cleaner_id uuid not null references public.cleaners(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete set null,
  amount decimal(10, 2) not null default 0,
  bonus decimal(10, 2) not null default 0,
  deduction decimal(10, 2) not null default 0,
  status text not null default 'Pending',
  paid_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  constraint payroll_records_status_check check (
    status in ('Pending', 'Approved', 'Paid', 'Disputed')
  ),
  constraint payroll_records_amounts_check check (
    amount >= 0 and bonus >= 0 and deduction >= 0
  )
);

create table if not exists public.cleaner_earnings (
  id uuid primary key default gen_random_uuid(),
  cleaner_id uuid not null references public.cleaners(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete set null,
  gross_amount decimal(10, 2) not null default 0,
  platform_fee decimal(10, 2) not null default 0,
  net_amount decimal(10, 2) not null default 0,
  status text not null default 'Pending',
  created_at timestamp with time zone not null default now(),
  constraint cleaner_earnings_status_check check (
    status in ('Pending', 'Approved', 'Paid', 'Disputed')
  ),
  constraint cleaner_earnings_amounts_check check (
    gross_amount >= 0 and platform_fee >= 0 and net_amount >= 0
  )
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  user_role text not null,
  title text not null,
  message text not null,
  notification_type text not null,
  read boolean not null default false,
  created_at timestamp with time zone not null default now(),
  constraint notifications_user_role_check check (
    user_role in ('customer', 'cleaner', 'admin')
  )
);

create table if not exists public.platform_settings (
  id uuid primary key default gen_random_uuid(),
  setting_key text not null unique,
  setting_value jsonb not null default '{}'::jsonb,
  updated_at timestamp with time zone not null default now()
);

create unique index if not exists payroll_records_booking_cleaner_idx
  on public.payroll_records (booking_id, cleaner_id)
  where booking_id is not null;
create unique index if not exists cleaner_earnings_booking_cleaner_idx
  on public.cleaner_earnings (booking_id, cleaner_id)
  where booking_id is not null;
create index if not exists cleaners_user_id_idx on public.cleaners (user_id);
create index if not exists bookings_schedule_idx
  on public.bookings (scheduled_start_time, scheduled_end_time);
create index if not exists support_tickets_customer_id_idx
  on public.support_tickets (customer_id);
create index if not exists support_tickets_status_priority_idx
  on public.support_tickets (status, priority);
create index if not exists support_messages_ticket_id_idx
  on public.support_messages (ticket_id, created_at);
create index if not exists payroll_records_cleaner_status_idx
  on public.payroll_records (cleaner_id, status);
create index if not exists cleaner_earnings_cleaner_status_idx
  on public.cleaner_earnings (cleaner_id, status);
create index if not exists notifications_user_role_read_idx
  on public.notifications (user_id, user_role, read, created_at desc);

alter table public.support_tickets enable row level security;
alter table public.support_messages enable row level security;
alter table public.payroll_records enable row level security;
alter table public.cleaner_earnings enable row level security;
alter table public.notifications enable row level security;
alter table public.platform_settings enable row level security;

grant select on table public.services to anon, authenticated;
grant select, insert, update, delete on table
  public.bookings,
  public.customers,
  public.customer_addresses,
  public.booking_requests,
  public.cleaners,
  public.cleaner_availability,
  public.booking_assignments,
  public.recurring_bookings,
  public.automation_logs,
  public.reviews,
  public.invoices,
  public.recurring_plan_change_requests,
  public.support_tickets,
  public.support_messages,
  public.payroll_records,
  public.cleaner_earnings,
  public.notifications,
  public.platform_settings
to authenticated;

drop policy if exists "Admins can manage services" on public.services;
create policy "Admins can manage services"
  on public.services for all
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists "Admins can manage bookings" on public.bookings;
create policy "Admins can manage bookings"
  on public.bookings for all
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists "Cleaners can view assigned bookings" on public.bookings;
create policy "Cleaners can view assigned bookings"
  on public.bookings for select
  to authenticated
  using (
    assigned_cleaner_id is not null
    and public.is_cleaner_user(assigned_cleaner_id)
  );

drop policy if exists "Cleaners can update assigned job status" on public.bookings;
create policy "Cleaners can update assigned job status"
  on public.bookings for update
  to authenticated
  using (
    assigned_cleaner_id is not null
    and public.is_cleaner_user(assigned_cleaner_id)
  )
  with check (
    assigned_cleaner_id is not null
    and public.is_cleaner_user(assigned_cleaner_id)
  );

drop policy if exists "Admins can manage customers" on public.customers;
create policy "Admins can manage customers"
  on public.customers for all
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists "Admins can manage customer addresses" on public.customer_addresses;
create policy "Admins can manage customer addresses"
  on public.customer_addresses for all
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists "Admins can manage booking requests" on public.booking_requests;
create policy "Admins can manage booking requests"
  on public.booking_requests for all
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists "Admins can manage cleaners" on public.cleaners;
create policy "Admins can manage cleaners"
  on public.cleaners for all
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists "Cleaners can view own profile" on public.cleaners;
create policy "Cleaners can view own profile"
  on public.cleaners for select
  to authenticated
  using (public.is_cleaner_user(id));

drop policy if exists "Cleaners can update own profile" on public.cleaners;
create policy "Cleaners can update own profile"
  on public.cleaners for update
  to authenticated
  using (public.is_cleaner_user(id))
  with check (public.is_cleaner_user(id));

drop policy if exists "Admins can manage cleaner availability" on public.cleaner_availability;
create policy "Admins can manage cleaner availability"
  on public.cleaner_availability for all
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists "Cleaners can manage own availability" on public.cleaner_availability;
create policy "Cleaners can manage own availability"
  on public.cleaner_availability for all
  to authenticated
  using (public.is_cleaner_user(cleaner_id))
  with check (public.is_cleaner_user(cleaner_id));

drop policy if exists "Admins can manage booking assignments" on public.booking_assignments;
create policy "Admins can manage booking assignments"
  on public.booking_assignments for all
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists "Cleaners can view own assignments" on public.booking_assignments;
create policy "Cleaners can view own assignments"
  on public.booking_assignments for select
  to authenticated
  using (public.is_cleaner_user(cleaner_id));

drop policy if exists "Admins can manage recurring bookings" on public.recurring_bookings;
create policy "Admins can manage recurring bookings"
  on public.recurring_bookings for all
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists "Admins can manage automation logs" on public.automation_logs;
create policy "Admins can manage automation logs"
  on public.automation_logs for all
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists "Admins can manage reviews" on public.reviews;
create policy "Admins can manage reviews"
  on public.reviews for all
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists "Admins can manage invoices" on public.invoices;
create policy "Admins can manage invoices"
  on public.invoices for all
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists "Admins can manage recurring change requests" on public.recurring_plan_change_requests;
create policy "Admins can manage recurring change requests"
  on public.recurring_plan_change_requests for all
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists "Customers can view own support tickets" on public.support_tickets;
create policy "Customers can view own support tickets"
  on public.support_tickets for select
  to authenticated
  using (
    exists (
      select 1 from public.customers
      where customers.id = support_tickets.customer_id
        and customers.user_id = auth.uid()
    )
  );

drop policy if exists "Customers can create own support tickets" on public.support_tickets;
create policy "Customers can create own support tickets"
  on public.support_tickets for insert
  to authenticated
  with check (
    exists (
      select 1 from public.customers
      where customers.id = support_tickets.customer_id
        and customers.user_id = auth.uid()
    )
  );

drop policy if exists "Admins can manage support tickets" on public.support_tickets;
create policy "Admins can manage support tickets"
  on public.support_tickets for all
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists "Customers can view own support messages" on public.support_messages;
create policy "Customers can view own support messages"
  on public.support_messages for select
  to authenticated
  using (
    exists (
      select 1
      from public.support_tickets
      join public.customers on customers.id = support_tickets.customer_id
      where support_tickets.id = support_messages.ticket_id
        and customers.user_id = auth.uid()
    )
  );

drop policy if exists "Customers can create own support messages" on public.support_messages;
create policy "Customers can create own support messages"
  on public.support_messages for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and sender_role = 'customer'
    and exists (
      select 1
      from public.support_tickets
      join public.customers on customers.id = support_tickets.customer_id
      where support_tickets.id = support_messages.ticket_id
        and customers.user_id = auth.uid()
    )
  );

drop policy if exists "Admins can manage support messages" on public.support_messages;
create policy "Admins can manage support messages"
  on public.support_messages for all
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists "Admins can manage payroll records" on public.payroll_records;
create policy "Admins can manage payroll records"
  on public.payroll_records for all
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists "Cleaners can view own payroll records" on public.payroll_records;
create policy "Cleaners can view own payroll records"
  on public.payroll_records for select
  to authenticated
  using (public.is_cleaner_user(cleaner_id));

drop policy if exists "Admins can manage cleaner earnings" on public.cleaner_earnings;
create policy "Admins can manage cleaner earnings"
  on public.cleaner_earnings for all
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists "Cleaners can view own earnings" on public.cleaner_earnings;
create policy "Cleaners can view own earnings"
  on public.cleaner_earnings for select
  to authenticated
  using (public.is_cleaner_user(cleaner_id));

drop policy if exists "Users can view own notifications" on public.notifications;
create policy "Users can view own notifications"
  on public.notifications for select
  to authenticated
  using (user_id = auth.uid() or public.is_platform_admin());

drop policy if exists "Users can update own notifications" on public.notifications;
create policy "Users can update own notifications"
  on public.notifications for update
  to authenticated
  using (user_id = auth.uid() or public.is_platform_admin())
  with check (user_id = auth.uid() or public.is_platform_admin());

drop policy if exists "Admins can create notifications" on public.notifications;
create policy "Admins can create notifications"
  on public.notifications for insert
  to authenticated
  with check (public.is_platform_admin());

drop policy if exists "Admins can manage platform settings" on public.platform_settings;
create policy "Admins can manage platform settings"
  on public.platform_settings for all
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop trigger if exists support_tickets_updated_at_trigger on public.support_tickets;
create trigger support_tickets_updated_at_trigger
  before update on public.support_tickets
  for each row execute function public.update_updated_at_column();

drop trigger if exists platform_settings_updated_at_trigger on public.platform_settings;
create trigger platform_settings_updated_at_trigger
  before update on public.platform_settings
  for each row execute function public.update_updated_at_column();

insert into public.platform_settings (setting_key, setting_value)
values
  ('payroll', '{"defaultCleanerPercentage": 65, "platformFeePercentage": 35}'::jsonb),
  ('scheduling', '{"defaultJobHours": 3, "allowManualOverride": true}'::jsonb),
  ('support', '{"defaultPriority": "Medium"}'::jsonb)
on conflict (setting_key) do nothing;

do $$
begin
  alter publication supabase_realtime add table public.bookings;
exception
  when undefined_object or duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.support_tickets;
exception
  when undefined_object or duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.support_messages;
exception
  when undefined_object or duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception
  when undefined_object or duplicate_object then null;
end $$;

notify pgrst, 'reload schema';
