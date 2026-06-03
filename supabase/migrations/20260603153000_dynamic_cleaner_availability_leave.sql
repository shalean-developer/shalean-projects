alter table public.cleaners
  add column if not exists working_days jsonb not null
    default '["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]'::jsonb,
  add column if not exists working_start_time time not null default '08:00',
  add column if not exists working_end_time time not null default '17:00';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'cleaners_working_days_array_check'
      and conrelid = 'public.cleaners'::regclass
  ) then
    alter table public.cleaners
      add constraint cleaners_working_days_array_check
      check (jsonb_typeof(working_days) = 'array')
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'cleaners_working_hours_check'
      and conrelid = 'public.cleaners'::regclass
  ) then
    alter table public.cleaners
      add constraint cleaners_working_hours_check
      check (working_end_time > working_start_time)
      not valid;
  end if;
end $$;

create table if not exists public.cleaner_leave_requests (
  id uuid primary key default gen_random_uuid(),
  cleaner_id uuid not null references public.cleaners(id) on delete cascade,
  request_type text not null,
  start_date date not null,
  end_date date not null,
  reason text not null,
  status text not null default 'Pending',
  admin_notes text,
  decided_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  constraint cleaner_leave_requests_type_check
    check (request_type in ('Leave', 'Sick Leave')),
  constraint cleaner_leave_requests_status_check
    check (status in ('Pending', 'Approved', 'Rejected')),
  constraint cleaner_leave_requests_date_check
    check (end_date >= start_date)
);

create index if not exists cleaner_leave_requests_cleaner_date_idx
  on public.cleaner_leave_requests (cleaner_id, start_date, end_date);

create index if not exists cleaner_leave_requests_status_idx
  on public.cleaner_leave_requests (status);

alter table public.cleaner_leave_requests enable row level security;

grant select, insert, update, delete on table public.cleaner_leave_requests to authenticated;

drop policy if exists "Cleaners can view own leave requests"
  on public.cleaner_leave_requests;
create policy "Cleaners can view own leave requests"
  on public.cleaner_leave_requests for select
  to authenticated
  using (
    exists (
      select 1
      from public.cleaners
      where cleaners.id = cleaner_leave_requests.cleaner_id
        and cleaners.user_id = auth.uid()
    )
  );

drop policy if exists "Cleaners can create own leave requests"
  on public.cleaner_leave_requests;
create policy "Cleaners can create own leave requests"
  on public.cleaner_leave_requests for insert
  to authenticated
  with check (
    status = 'Pending'
    and exists (
      select 1
      from public.cleaners
      where cleaners.id = cleaner_leave_requests.cleaner_id
        and cleaners.user_id = auth.uid()
    )
  );

drop policy if exists "Admins can manage cleaner leave requests"
  on public.cleaner_leave_requests;
create policy "Admins can manage cleaner leave requests"
  on public.cleaner_leave_requests for all
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop trigger if exists prevent_cleaner_same_date_double_booking_trigger
  on public.booking_assignments;
drop function if exists public.prevent_cleaner_same_date_double_booking();

create or replace function public.prevent_cleaner_overlapping_booking()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_start timestamp with time zone;
  target_end timestamp with time zone;
begin
  if new.assignment_status = 'Cancelled' then
    return new;
  end if;

  select
    coalesce(scheduled_start_time, (booking_date::text || 'T' || left(booking_time::text, 5) || ':00')::timestamp with time zone),
    coalesce(scheduled_end_time, coalesce(scheduled_start_time, (booking_date::text || 'T' || left(booking_time::text, 5) || ':00')::timestamp with time zone) + interval '3 hours')
  into target_start, target_end
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
      and existing_booking.status <> 'Cancelled'
      and coalesce(existing_booking.scheduled_start_time, (existing_booking.booking_date::text || 'T' || left(existing_booking.booking_time::text, 5) || ':00')::timestamp with time zone) < target_end
      and coalesce(existing_booking.scheduled_end_time, coalesce(existing_booking.scheduled_start_time, (existing_booking.booking_date::text || 'T' || left(existing_booking.booking_time::text, 5) || ':00')::timestamp with time zone) + interval '3 hours') > target_start
  ) then
    raise exception 'Cleaner already has an overlapping booking.';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_cleaner_overlapping_booking_trigger
  on public.booking_assignments;

create trigger prevent_cleaner_overlapping_booking_trigger
before insert or update on public.booking_assignments
for each row execute function public.prevent_cleaner_overlapping_booking();

create or replace view public.cleaner_calendar_events as
select
  booking_assignments.cleaner_id,
  bookings.id as source_id,
  'Booking'::text as event_type,
  bookings.booking_date as start_date,
  bookings.booking_date as end_date,
  bookings.booking_time as start_time,
  coalesce(bookings.scheduled_end_time::time, bookings.booking_time + interval '3 hours') as end_time,
  bookings.service_data ->> 'serviceName' as title,
  bookings.status as status
from public.booking_assignments
join public.bookings on bookings.id = booking_assignments.booking_id
where booking_assignments.assignment_status <> 'Cancelled'
union all
select
  cleaner_leave_requests.cleaner_id,
  cleaner_leave_requests.id as source_id,
  cleaner_leave_requests.request_type as event_type,
  cleaner_leave_requests.start_date,
  cleaner_leave_requests.end_date,
  null::time as start_time,
  null::time as end_time,
  cleaner_leave_requests.reason as title,
  cleaner_leave_requests.status
from public.cleaner_leave_requests;

notify pgrst, 'reload schema';
