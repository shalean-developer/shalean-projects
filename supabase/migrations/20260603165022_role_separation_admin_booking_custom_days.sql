create extension if not exists pgcrypto;

alter table public.customers
  alter column user_id drop not null,
  add column if not exists account_role text not null default 'customer',
  add column if not exists notes text;

alter table public.cleaners
  add column if not exists account_role text not null default 'cleaner';

create table if not exists public.admins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  permission_level text not null default 'Admin',
  status text not null default 'Active',
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint admins_permission_level_check check (
    permission_level in ('Owner', 'Admin', 'Operations', 'Support')
  ),
  constraint admins_status_check check (status in ('Active', 'Inactive'))
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'customers_account_role_check'
      and conrelid = 'public.customers'::regclass
  ) then
    alter table public.customers
      add constraint customers_account_role_check
      check (account_role = 'customer')
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'cleaners_account_role_check'
      and conrelid = 'public.cleaners'::regclass
  ) then
    alter table public.cleaners
      add constraint cleaners_account_role_check
      check (account_role = 'cleaner')
      not valid;
  end if;
end $$;

update public.customers
set account_role = 'customer'
where account_role is distinct from 'customer';

update public.cleaners
set account_role = 'cleaner'
where account_role is distinct from 'cleaner';

insert into public.admins (user_id, full_name, email, phone, permission_level, status)
select
  users.id,
  coalesce(nullif(users.raw_user_meta_data ->> 'full_name', ''), split_part(coalesce(users.email, ''), '@', 1), 'Admin'),
  coalesce(users.email, ''),
  nullif(users.raw_user_meta_data ->> 'phone', ''),
  coalesce(nullif(users.raw_app_meta_data ->> 'permission_level', ''), 'Admin'),
  'Active'
from auth.users
where coalesce(users.raw_app_meta_data ->> 'role', users.raw_user_meta_data ->> 'role', '') = 'admin'
on conflict (user_id) do update set
  full_name = excluded.full_name,
  email = excluded.email,
  phone = excluded.phone,
  permission_level = excluded.permission_level,
  updated_at = now();

create index if not exists customers_account_role_idx
  on public.customers (account_role);
create index if not exists customers_email_lower_idx
  on public.customers (lower(email))
  where email is not null and email <> '';
create index if not exists customers_phone_idx
  on public.customers (phone)
  where phone is not null and phone <> '';
create index if not exists cleaners_account_role_idx
  on public.cleaners (account_role);
create index if not exists admins_user_id_idx on public.admins (user_id);
create index if not exists admins_email_lower_idx on public.admins (lower(email));
create index if not exists admins_status_idx on public.admins (status);

create index if not exists customers_user_id_customer_idx
  on public.customers (user_id)
  where user_id is not null and account_role = 'customer';

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
      and cleaners.account_role = 'cleaner'
      and (
        cleaners.user_id = auth.uid()
        or lower(cleaners.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
  );
$$;

create or replace function public.is_customer_user(customer_uuid uuid)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.customers
    where customers.id = customer_uuid
      and customers.account_role = 'customer'
      and customers.user_id = auth.uid()
      and not exists (
        select 1 from public.cleaners
        where cleaners.user_id = auth.uid()
      )
      and not exists (
        select 1 from public.admins
        where admins.user_id = auth.uid()
      )
  );
$$;

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

create or replace function public.handle_new_customer_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_role text;
begin
  profile_role := coalesce(
    nullif(new.raw_app_meta_data ->> 'role', ''),
    nullif(new.raw_user_meta_data ->> 'role', ''),
    'customer'
  );

  if profile_role = 'cleaner' then
    update public.cleaners
    set user_id = new.id,
        full_name = coalesce(nullif(full_name, ''), nullif(new.raw_user_meta_data ->> 'full_name', ''), full_name),
        email = coalesce(new.email, email),
        phone = coalesce(nullif(new.raw_user_meta_data ->> 'phone', ''), phone),
        account_role = 'cleaner'
    where lower(email) = lower(coalesce(new.email, ''))
       or phone = nullif(new.raw_user_meta_data ->> 'phone', '');

    return new;
  end if;

  if profile_role = 'admin' then
    insert into public.admins (user_id, full_name, email, phone, permission_level, status)
    values (
      new.id,
      coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(coalesce(new.email, ''), '@', 1), 'Admin'),
      coalesce(new.email, ''),
      nullif(new.raw_user_meta_data ->> 'phone', ''),
      coalesce(nullif(new.raw_app_meta_data ->> 'permission_level', ''), 'Admin'),
      'Active'
    )
    on conflict (user_id) do update set
      full_name = excluded.full_name,
      email = excluded.email,
      phone = excluded.phone,
      permission_level = excluded.permission_level,
      status = excluded.status,
      updated_at = now();

    return new;
  end if;

  insert into public.customers (user_id, full_name, email, phone, account_role)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(coalesce(new.email, ''), '@', 1), 'Shalean customer'),
    coalesce(new.email, ''),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    'customer'
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

-- Safe mixed-profile cleanup plan:
-- 1. Identify customer rows that are actually cleaner/admin auth profiles.
-- 2. Reassign dependent records to a neutral customer row when history exists.
-- 3. Delete the incorrect customer profile after reassignment.
do $$
declare
  mixed record;
  replacement_customer_id uuid;
begin
  for mixed in
    select c.*
    from public.customers c
    where (
      c.user_id is not null
      and (
        exists (select 1 from public.cleaners cl where cl.user_id = c.user_id)
        or exists (select 1 from public.admins a where a.user_id = c.user_id)
      )
    )
    or exists (
      select 1
      from public.cleaners cl
      where lower(cl.email) = lower(c.email)
         or (c.phone is not null and c.phone <> '' and cl.phone = c.phone)
    )
  loop
    if exists (select 1 from public.bookings where customer_id = mixed.id)
      or exists (select 1 from public.customer_addresses where customer_id = mixed.id)
      or exists (select 1 from public.booking_requests where customer_id = mixed.id)
      or exists (select 1 from public.recurring_bookings where customer_id = mixed.id)
      or exists (select 1 from public.automation_logs where customer_id = mixed.id)
      or exists (select 1 from public.reviews where customer_id = mixed.id)
      or exists (select 1 from public.invoices where customer_id = mixed.id)
      or exists (select 1 from public.recurring_plan_change_requests where customer_id = mixed.id)
      or exists (select 1 from public.support_tickets where customer_id = mixed.id)
    then
      insert into public.customers (full_name, email, phone, account_role, notes)
      values (
        mixed.full_name,
        mixed.email,
        mixed.phone,
        'customer',
        'Created by role-separation migration to preserve customer history from mixed profile ' || mixed.id::text
      )
      returning id into replacement_customer_id;

      update public.bookings set customer_id = replacement_customer_id where customer_id = mixed.id;
      update public.customer_addresses set customer_id = replacement_customer_id where customer_id = mixed.id;
      update public.booking_requests set customer_id = replacement_customer_id where customer_id = mixed.id;
      update public.recurring_bookings set customer_id = replacement_customer_id where customer_id = mixed.id;
      update public.automation_logs set customer_id = replacement_customer_id where customer_id = mixed.id;
      update public.reviews set customer_id = replacement_customer_id where customer_id = mixed.id;
      update public.invoices set customer_id = replacement_customer_id where customer_id = mixed.id;
      update public.recurring_plan_change_requests set customer_id = replacement_customer_id where customer_id = mixed.id;
      update public.support_tickets set customer_id = replacement_customer_id where customer_id = mixed.id;
    end if;

    delete from public.customers where id = mixed.id;
  end loop;
end $$;

alter table public.recurring_bookings
  add column if not exists preferred_days text[] not null default array[]::text[];

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'recurring_bookings_frequency_check'
      and conrelid = 'public.recurring_bookings'::regclass
  ) then
    alter table public.recurring_bookings
      drop constraint recurring_bookings_frequency_check;
  end if;

  if exists (
    select 1
    from pg_constraint
    where conname = 'recurring_bookings_preferred_days_check'
      and conrelid = 'public.recurring_bookings'::regclass
  ) then
    alter table public.recurring_bookings
      drop constraint recurring_bookings_preferred_days_check;
  end if;
end $$;

update public.recurring_bookings
set preferred_days = regexp_split_to_array(preferred_day, '\s*,\s*')
where cardinality(preferred_days) = 0
  and preferred_day is not null
  and preferred_day <> '';

alter table public.recurring_bookings
  add constraint recurring_bookings_frequency_check
  check (frequency in ('Weekly', 'Bi-weekly', 'Monthly', 'Custom days')),
  add constraint recurring_bookings_preferred_days_check
  check (
    preferred_days <@ array[
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday'
    ]::text[]
  );

create index if not exists recurring_bookings_preferred_days_idx
  on public.recurring_bookings using gin (preferred_days);

alter table public.admins enable row level security;
grant select, insert, update, delete on table public.admins to authenticated;

drop policy if exists "Admins can view own admin profile" on public.admins;
create policy "Admins can view own admin profile"
  on public.admins for select
  to authenticated
  using (user_id = auth.uid() and status = 'Active');

drop policy if exists "Platform admins can manage admins" on public.admins;
create policy "Platform admins can manage admins"
  on public.admins for all
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists "Customers can view own profile" on public.customers;
create policy "Customers can view own profile"
  on public.customers for select
  to authenticated
  using (public.is_customer_user(id));

drop policy if exists "Customers can insert own profile" on public.customers;
create policy "Customers can insert own profile"
  on public.customers for insert
  to authenticated
  with check (
    account_role = 'customer'
    and user_id = auth.uid()
    and not exists (select 1 from public.cleaners where cleaners.user_id = auth.uid())
    and not exists (select 1 from public.admins where admins.user_id = auth.uid())
  );

drop policy if exists "Customers can update own profile" on public.customers;
create policy "Customers can update own profile"
  on public.customers for update
  to authenticated
  using (public.is_customer_user(id))
  with check (public.is_customer_user(id));

drop policy if exists "Customers can view own addresses" on public.customer_addresses;
create policy "Customers can view own addresses"
  on public.customer_addresses for select
  to authenticated
  using (public.is_customer_user(customer_id));

drop policy if exists "Customers can insert own addresses" on public.customer_addresses;
create policy "Customers can insert own addresses"
  on public.customer_addresses for insert
  to authenticated
  with check (public.is_customer_user(customer_id));

drop policy if exists "Customers can update own addresses" on public.customer_addresses;
create policy "Customers can update own addresses"
  on public.customer_addresses for update
  to authenticated
  using (public.is_customer_user(customer_id))
  with check (public.is_customer_user(customer_id));

drop policy if exists "Customers can delete own addresses" on public.customer_addresses;
create policy "Customers can delete own addresses"
  on public.customer_addresses for delete
  to authenticated
  using (public.is_customer_user(customer_id));

drop policy if exists "Customers can view own bookings" on public.bookings;
create policy "Customers can view own bookings"
  on public.bookings for select
  to authenticated
  using (
    customer_id is not null
    and public.is_customer_user(customer_id)
  );

drop policy if exists "Customers can view own booking requests" on public.booking_requests;
create policy "Customers can view own booking requests"
  on public.booking_requests for select
  to authenticated
  using (public.is_customer_user(customer_id));

drop policy if exists "Customers can create own booking requests" on public.booking_requests;
create policy "Customers can create own booking requests"
  on public.booking_requests for insert
  to authenticated
  with check (
    public.is_customer_user(customer_id)
    and exists (
      select 1
      from public.bookings
      where bookings.id = booking_requests.booking_id
        and bookings.customer_id = booking_requests.customer_id
    )
  );

drop policy if exists "Customers can view own recurring bookings" on public.recurring_bookings;
create policy "Customers can view own recurring bookings"
  on public.recurring_bookings for select
  to authenticated
  using (public.is_customer_user(customer_id));

drop policy if exists "Customers can create own recurring bookings" on public.recurring_bookings;
create policy "Customers can create own recurring bookings"
  on public.recurring_bookings for insert
  to authenticated
  with check (public.is_customer_user(customer_id));

drop policy if exists "Customers can update own recurring bookings" on public.recurring_bookings;
create policy "Customers can update own recurring bookings"
  on public.recurring_bookings for update
  to authenticated
  using (public.is_customer_user(customer_id))
  with check (public.is_customer_user(customer_id));

drop policy if exists "Customers can view own automation logs" on public.automation_logs;
create policy "Customers can view own automation logs"
  on public.automation_logs for select
  to authenticated
  using (
    customer_id is not null
    and public.is_customer_user(customer_id)
  );

drop policy if exists "Customers can view own reviews" on public.reviews;
create policy "Customers can view own reviews"
  on public.reviews for select
  to authenticated
  using (public.is_customer_user(customer_id));

drop policy if exists "Customers can create own reviews" on public.reviews;
create policy "Customers can create own reviews"
  on public.reviews for insert
  to authenticated
  with check (
    public.is_customer_user(customer_id)
    and exists (
      select 1
      from public.bookings
      where bookings.id = reviews.booking_id
        and bookings.customer_id = reviews.customer_id
        and bookings.status = 'Completed'
    )
  );

drop policy if exists "Customers can view own invoices" on public.invoices;
create policy "Customers can view own invoices"
  on public.invoices for select
  to authenticated
  using (
    customer_id is not null
    and public.is_customer_user(customer_id)
  );

drop policy if exists "Customers can view invoice line items" on public.invoice_line_items;
create policy "Customers can view invoice line items"
  on public.invoice_line_items for select
  to authenticated
  using (
    exists (
      select 1
      from public.invoices
      where invoices.id = invoice_line_items.invoice_id
        and invoices.customer_id is not null
        and public.is_customer_user(invoices.customer_id)
    )
  );

drop policy if exists "Customers can view own recurring change requests"
  on public.recurring_plan_change_requests;
create policy "Customers can view own recurring change requests"
  on public.recurring_plan_change_requests for select
  to authenticated
  using (public.is_customer_user(customer_id));

drop policy if exists "Customers can create own recurring change requests"
  on public.recurring_plan_change_requests;
create policy "Customers can create own recurring change requests"
  on public.recurring_plan_change_requests for insert
  to authenticated
  with check (
    public.is_customer_user(customer_id)
    and exists (
      select 1
      from public.recurring_bookings
      where recurring_bookings.id = recurring_plan_change_requests.recurring_booking_id
        and recurring_bookings.customer_id = recurring_plan_change_requests.customer_id
    )
  );

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

notify pgrst, 'reload schema';
