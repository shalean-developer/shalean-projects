create table if not exists public.cleaners (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text not null,
  profile_photo text,
  bio text,
  specialties jsonb not null default '[]'::jsonb,
  rating decimal(3, 2) not null default 0,
  completed_jobs integer not null default 0,
  active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  constraint cleaners_specialties_array_check check (jsonb_typeof(specialties) = 'array'),
  constraint cleaners_rating_check check (rating >= 0 and rating <= 5),
  constraint cleaners_completed_jobs_check check (completed_jobs >= 0)
);

create table if not exists public.cleaner_availability (
  id uuid primary key default gen_random_uuid(),
  cleaner_id uuid not null references public.cleaners(id) on delete cascade,
  available_date date not null,
  start_time time not null,
  end_time time not null,
  is_available boolean not null default true,
  created_at timestamp with time zone not null default now(),
  constraint cleaner_availability_time_check check (end_time > start_time)
);

create table if not exists public.booking_assignments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  cleaner_id uuid not null references public.cleaners(id),
  assignment_status text not null default 'Assigned',
  assigned_at timestamp with time zone not null default now(),
  created_at timestamp with time zone not null default now(),
  constraint booking_assignments_status_check check (
    assignment_status in ('Assigned', 'Reassigned', 'Cancelled')
  )
);

alter table public.bookings
  add column if not exists assigned_cleaner_id uuid references public.cleaners(id),
  add column if not exists job_status text not null default 'Not Assigned';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'bookings_assigned_cleaner_id_fkey'
      and conrelid = 'public.bookings'::regclass
  ) then
    alter table public.bookings
      add constraint bookings_assigned_cleaner_id_fkey
      foreign key (assigned_cleaner_id)
      references public.cleaners(id)
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'bookings_job_status_check'
      and conrelid = 'public.bookings'::regclass
  ) then
    alter table public.bookings
      add constraint bookings_job_status_check
      check (
        job_status in (
          'Not Assigned',
          'Assigned',
          'On The Way',
          'In Progress',
          'Completed',
          'Cancelled'
        )
      )
      not valid;
  end if;
end $$;

create index if not exists cleaners_active_idx on public.cleaners (active);
create index if not exists cleaners_specialties_idx on public.cleaners using gin (specialties);
create index if not exists cleaner_availability_cleaner_date_idx
  on public.cleaner_availability (cleaner_id, available_date);
create index if not exists cleaner_availability_date_time_idx
  on public.cleaner_availability (available_date, start_time, end_time);
create index if not exists booking_assignments_booking_id_idx
  on public.booking_assignments (booking_id);
create index if not exists booking_assignments_cleaner_id_idx
  on public.booking_assignments (cleaner_id);
create index if not exists bookings_assigned_cleaner_id_idx
  on public.bookings (assigned_cleaner_id);
create index if not exists bookings_job_status_idx on public.bookings (job_status);

alter table public.cleaners enable row level security;
alter table public.cleaner_availability enable row level security;
alter table public.booking_assignments enable row level security;
