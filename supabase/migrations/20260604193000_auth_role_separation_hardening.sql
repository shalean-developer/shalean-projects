create extension if not exists pgcrypto;

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admins
    where admins.user_id = auth.uid()
      and admins.status = 'Active'
  );
$$;

create unique index if not exists customers_user_id_unique_idx
  on public.customers (user_id)
  where user_id is not null and account_role = 'customer';

create unique index if not exists cleaners_user_id_unique_idx
  on public.cleaners (user_id)
  where user_id is not null and account_role = 'cleaner';

create unique index if not exists cleaners_phone_unique_idx
  on public.cleaners (phone)
  where phone is not null and phone <> '';

create or replace function public.handle_new_customer_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  app_role text;
  profile_phone text;
begin
  app_role := coalesce(nullif(new.raw_app_meta_data ->> 'role', ''), 'customer');
  profile_phone := nullif(new.raw_user_meta_data ->> 'phone', '');

  if app_role = 'cleaner' then
    update public.cleaners
    set user_id = new.id,
        full_name = coalesce(nullif(full_name, ''), nullif(new.raw_user_meta_data ->> 'full_name', ''), full_name),
        email = coalesce(new.email, email),
        phone = coalesce(profile_phone, phone),
        account_role = 'cleaner'
    where lower(email) = lower(coalesce(new.email, ''))
       or (profile_phone is not null and phone = profile_phone);

    return new;
  end if;

  if app_role = 'admin' then
    insert into public.admins (user_id, full_name, email, phone, permission_level, status)
    values (
      new.id,
      coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(coalesce(new.email, ''), '@', 1), 'Admin'),
      coalesce(new.email, ''),
      profile_phone,
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
    profile_phone,
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

notify pgrst, 'reload schema';
