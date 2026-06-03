alter table public.services
  add column if not exists slug text,
  add column if not exists short_description text not null default '',
  add column if not exists room_price decimal(10, 2) not null default 0,
  add column if not exists bathroom_price decimal(10, 2) not null default 0,
  add column if not exists service_fee_type text not null default 'flat',
  add column if not exists service_fee_amount decimal(10, 2) not null default 0,
  add column if not exists question_schema jsonb not null default '[]'::jsonb,
  add column if not exists benefits jsonb not null default '[]'::jsonb,
  add column if not exists included jsonb not null default '[]'::jsonb,
  add column if not exists pricing_rule_notes text not null default '',
  add column if not exists updated_at timestamp with time zone not null default now();

update public.services
set slug = lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'))
where slug is null or slug = '';

alter table public.services
  alter column slug set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'services_slug_key'
      and conrelid = 'public.services'::regclass
  ) then
    alter table public.services add constraint services_slug_key unique (slug);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'services_fee_type_check'
      and conrelid = 'public.services'::regclass
  ) then
    alter table public.services
      add constraint services_fee_type_check
      check (service_fee_type in ('flat', 'percentage'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'services_price_amounts_check'
      and conrelid = 'public.services'::regclass
  ) then
    alter table public.services
      add constraint services_price_amounts_check
      check (
        base_price >= 0
        and room_price >= 0
        and bathroom_price >= 0
        and service_fee_amount >= 0
      );
  end if;
end $$;

create table if not exists public.service_addons (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  addon_key text not null,
  label text not null,
  price decimal(10, 2) not null default 0,
  active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint service_addons_price_check check (price >= 0),
  constraint service_addons_key_unique unique (service_id, addon_key)
);

create table if not exists public.service_pricing_rules (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  name text not null,
  rule_type text not null default 'manual',
  adjustment_type text not null default 'flat',
  adjustment_value decimal(10, 2) not null default 0,
  active boolean not null default true,
  starts_at timestamp with time zone,
  ends_at timestamp with time zone,
  notes text not null default '',
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint service_pricing_rules_adjustment_type_check check (
    adjustment_type in ('flat', 'percentage')
  ),
  constraint service_pricing_rules_value_check check (adjustment_value >= 0)
);

create table if not exists public.pricing_history (
  id uuid primary key default gen_random_uuid(),
  service_id uuid references public.services(id) on delete set null,
  changed_by uuid references auth.users(id) on delete set null,
  change_type text not null,
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now()
);

alter table public.cleaners
  add column if not exists role text not null default 'Cleaner',
  add column if not exists started_at date;

update public.cleaners
set started_at = created_at::date
where started_at is null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'cleaners_role_check'
      and conrelid = 'public.cleaners'::regclass
  ) then
    alter table public.cleaners
      add constraint cleaners_role_check
      check (role in ('Cleaner', 'Team Leader'));
  end if;
end $$;

alter table public.cleaner_earnings
  add column if not exists booking_amount decimal(10, 2) not null default 0,
  add column if not exists service_fee decimal(10, 2) not null default 0,
  add column if not exists net_booking_value decimal(10, 2) not null default 0,
  add column if not exists cleaner_percentage decimal(5, 2),
  add column if not exists cleaner_role text not null default 'Cleaner',
  add column if not exists tenure_months integer not null default 0,
  add column if not exists calculation_details jsonb not null default '{}'::jsonb;

update public.cleaner_earnings
set booking_amount = gross_amount,
    service_fee = platform_fee,
    net_booking_value = greatest(gross_amount - platform_fee, 0)
where booking_amount = 0
  and gross_amount > 0;

create index if not exists service_addons_service_active_idx
  on public.service_addons (service_id, active);
create index if not exists service_pricing_rules_service_active_idx
  on public.service_pricing_rules (service_id, active);
create index if not exists pricing_history_service_created_idx
  on public.pricing_history (service_id, created_at desc);
create index if not exists cleaner_earnings_booking_idx
  on public.cleaner_earnings (booking_id);

alter table public.service_addons enable row level security;
alter table public.service_pricing_rules enable row level security;
alter table public.pricing_history enable row level security;

grant select on table public.service_addons, public.service_pricing_rules to anon, authenticated;
grant select, insert, update, delete on table
  public.service_addons,
  public.service_pricing_rules,
  public.pricing_history
to authenticated;

drop policy if exists "Admins can manage service addons" on public.service_addons;
create policy "Admins can manage service addons"
  on public.service_addons for all
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists "Anyone can view active service addons" on public.service_addons;
create policy "Anyone can view active service addons"
  on public.service_addons for select
  to anon, authenticated
  using (active = true);

drop policy if exists "Admins can manage service pricing rules" on public.service_pricing_rules;
create policy "Admins can manage service pricing rules"
  on public.service_pricing_rules for all
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists "Anyone can view active service pricing rules" on public.service_pricing_rules;
create policy "Anyone can view active service pricing rules"
  on public.service_pricing_rules for select
  to anon, authenticated
  using (active = true);

drop policy if exists "Admins can view pricing history" on public.pricing_history;
create policy "Admins can view pricing history"
  on public.pricing_history for select
  to authenticated
  using (public.is_platform_admin());

drop policy if exists "Admins can create pricing history" on public.pricing_history;
create policy "Admins can create pricing history"
  on public.pricing_history for insert
  to authenticated
  with check (public.is_platform_admin());

drop trigger if exists services_updated_at_trigger on public.services;
create trigger services_updated_at_trigger
  before update on public.services
  for each row execute function public.update_updated_at_column();

drop trigger if exists service_addons_updated_at_trigger on public.service_addons;
create trigger service_addons_updated_at_trigger
  before update on public.service_addons
  for each row execute function public.update_updated_at_column();

drop trigger if exists service_pricing_rules_updated_at_trigger on public.service_pricing_rules;
create trigger service_pricing_rules_updated_at_trigger
  before update on public.service_pricing_rules
  for each row execute function public.update_updated_at_column();

with service_seed as (
  select *
  from (values
    (
      'regular-cleaning',
      'Regular Cleaning',
      'Reliable upkeep for homes that need a fresh, consistent clean.',
      'A practical home cleaning service for once-off refreshes or recurring weekly, bi-weekly, and monthly upkeep.',
      350.00::decimal,
      100.00::decimal,
      80.00::decimal,
      45.00::decimal,
      180,
      '[{"id":"bedrooms","label":"Bedrooms","type":"number","required":true},{"id":"bathrooms","label":"Bathrooms","type":"number","required":true},{"id":"cleaning_frequency","label":"Cleaning Frequency","type":"select","required":true,"options":["Once-Off","Weekly","Bi-Weekly","Monthly"]}]'::jsonb,
      '["Keeps the home consistently presentable","Flexible frequency for changing household needs","Simple add-ons for common household extras"]'::jsonb,
      '["Kitchen and bathroom surface cleaning","Bedroom and living area dusting","Floor sweeping and mopping","General tidying and rubbish removal"]'::jsonb
    ),
    (
      'airbnb-cleaning',
      'Airbnb Cleaning',
      'Fast, guest-ready turnovers for short-stay properties.',
      'A turnover-focused clean for Airbnb hosts who need reliable reset timing between check-out and check-in.',
      450.00::decimal,
      120.00::decimal,
      90.00::decimal,
      55.00::decimal,
      210,
      '[{"id":"bedrooms","label":"Bedrooms","type":"number","required":true},{"id":"bathrooms","label":"Bathrooms","type":"number","required":true},{"id":"check_out_time","label":"Check-Out Time","type":"time","required":true},{"id":"check_in_time","label":"Check-In Time","type":"time","required":true}]'::jsonb,
      '["Designed around guest turnover timing","Helps protect ratings and arrival experience","Optional supply and inspection support"]'::jsonb,
      '["Kitchen and bathroom cleaning","Bedroom reset and presentation","Floor cleaning and rubbish removal","Guest-ready final check"]'::jsonb
    ),
    (
      'office-cleaning',
      'Office Cleaning',
      'Professional workspace cleaning for small teams and offices.',
      'A workplace cleaning service that keeps desks, shared spaces, kitchens, and bathrooms ready for productive days.',
      650.00::decimal,
      0.00::decimal,
      120.00::decimal,
      65.00::decimal,
      240,
      '[{"id":"office_size_sqm","label":"Office Size (sqm)","type":"number","required":true},{"id":"number_of_employees","label":"Number of Employees","type":"number","required":true},{"id":"number_of_bathrooms","label":"Number of Bathrooms","type":"number","required":true},{"id":"cleaning_frequency","label":"Cleaning Frequency","type":"select","required":true,"options":["Once-Off","Weekly","Bi-Weekly","Monthly"]}]'::jsonb,
      '["Supports a cleaner daily work environment","Scales to office size and team count","After-hours options reduce workplace disruption"]'::jsonb,
      '["Desk and surface wipe-downs","Shared kitchen cleaning","Bathroom cleaning","Floor and bin service"]'::jsonb
    ),
    (
      'carpet-cleaning',
      'Carpet Cleaning',
      'Focused carpet care for rooms, rugs, stains, and odours.',
      'A carpet-specific cleaning service with optional treatments for stains, pets, high-traffic zones, and faster drying.',
      500.00::decimal,
      125.00::decimal,
      0.00::decimal,
      50.00::decimal,
      180,
      '[{"id":"number_of_rooms","label":"Number of Rooms","type":"number","required":true},{"id":"carpet_area","label":"Carpet Area","type":"text","required":true,"placeholder":"e.g. 45 sqm or lounge and hallway"},{"id":"stain_treatment_required","label":"Stain Treatment Required","type":"select","required":true,"options":["No","Yes"]}]'::jsonb,
      '["Targets carpet condition rather than generic room cleaning","Useful for stains, odours, and worn walkways","Optional protection helps carpets stay cleaner longer"]'::jsonb,
      '["Carpet assessment","Standard carpet cleaning","Room-by-room treatment plan","Post-clean care guidance"]'::jsonb
    ),
    (
      'moving-cleaning',
      'Moving Cleaning',
      'Detailed move-in and move-out cleaning for empty or furnished homes.',
      'A thorough property clean for tenants, owners, and agents preparing a home before or after a move.',
      900.00::decimal,
      180.00::decimal,
      130.00::decimal,
      75.00::decimal,
      360,
      '[{"id":"property_type","label":"Property Type","type":"select","required":true,"options":["Apartment","Townhouse","House","Commercial Unit"]},{"id":"bedrooms","label":"Bedrooms","type":"number","required":true},{"id":"bathrooms","label":"Bathrooms","type":"number","required":true},{"id":"property_condition","label":"Property Condition","type":"select","required":true,"options":["Lightly Used","Average","Needs Heavy Cleaning"]},{"id":"furnished_or_empty","label":"Furnished or Empty","type":"select","required":true,"options":["Furnished","Empty"]}]'::jsonb,
      '["Helps prepare properties for handover","Captures condition and furnishing details upfront","Add-ons cover move-specific problem areas"]'::jsonb,
      '["Kitchen and bathroom deep clean","Interior surface cleaning","Floor cleaning","Move-ready final pass"]'::jsonb
    ),
    (
      'deep-cleaning',
      'Deep Cleaning',
      'Detailed cleaning for neglected, high-use, or hard-to-reach areas.',
      'A more intensive clean for kitchens, bathrooms, cupboards, appliance zones, and other areas needing extra attention.',
      750.00::decimal,
      150.00::decimal,
      120.00::decimal,
      70.00::decimal,
      300,
      '[{"id":"bedrooms","label":"Bedrooms","type":"number","required":true},{"id":"bathrooms","label":"Bathrooms","type":"number","required":true},{"id":"areas_requiring_extra_attention","label":"Areas Requiring Extra Attention","type":"textarea","required":true,"placeholder":"e.g. kitchen tiles, main bathroom, cupboards"}]'::jsonb,
      '["Best for detailed resets beyond routine cleaning","Captures extra-attention areas before booking","Optional treatments support tougher jobs"]'::jsonb,
      '["Kitchen and bathroom detail cleaning","High-touch surface cleaning","Focused dust and grime removal","Detailed floor finish"]'::jsonb
    )
  ) as seeded(
    slug,
    name,
    short_description,
    description,
    base_price,
    room_price,
    bathroom_price,
    service_fee_amount,
    duration_minutes,
    question_schema,
    benefits,
    included
  )
)
insert into public.services (
  slug,
  name,
  short_description,
  description,
  base_price,
  room_price,
  bathroom_price,
  service_fee_type,
  service_fee_amount,
  duration_minutes,
  question_schema,
  benefits,
  included,
  active
)
select
  slug,
  name,
  short_description,
  description,
  base_price,
  room_price,
  bathroom_price,
  'flat',
  service_fee_amount,
  duration_minutes,
  question_schema,
  benefits,
  included,
  true
from service_seed
on conflict (slug) do update set
  name = excluded.name,
  short_description = excluded.short_description,
  description = excluded.description,
  base_price = excluded.base_price,
  room_price = excluded.room_price,
  bathroom_price = excluded.bathroom_price,
  service_fee_type = excluded.service_fee_type,
  service_fee_amount = excluded.service_fee_amount,
  duration_minutes = excluded.duration_minutes,
  question_schema = excluded.question_schema,
  benefits = excluded.benefits,
  included = excluded.included,
  updated_at = now();

with addon_seed as (
  select s.id as service_id, seeded.*
  from (values
    ('regular-cleaning', 'inside_fridge_cleaning', 'Inside Fridge Cleaning', 120.00::decimal),
    ('regular-cleaning', 'inside_oven_cleaning', 'Inside Oven Cleaning', 150.00::decimal),
    ('regular-cleaning', 'interior_window_cleaning', 'Interior Window Cleaning', 180.00::decimal),
    ('regular-cleaning', 'laundry_folding', 'Laundry Folding', 100.00::decimal),
    ('regular-cleaning', 'dishwashing', 'Dishwashing', 90.00::decimal),
    ('regular-cleaning', 'extra_bathroom_cleaning', 'Extra Bathroom Cleaning', 140.00::decimal),
    ('airbnb-cleaning', 'linen_change', 'Linen Change', 160.00::decimal),
    ('airbnb-cleaning', 'towel_replacement', 'Towel Replacement', 90.00::decimal),
    ('airbnb-cleaning', 'restock_guest_supplies', 'Restock Guest Supplies', 130.00::decimal),
    ('airbnb-cleaning', 'key_handover_support', 'Key Handover Support', 180.00::decimal),
    ('airbnb-cleaning', 'same_day_turnover_priority', 'Same-Day Turnover Priority', 250.00::decimal),
    ('airbnb-cleaning', 'property_inspection_report', 'Property Inspection Report', 120.00::decimal),
    ('office-cleaning', 'desk_sanitising', 'Desk Sanitising', 160.00::decimal),
    ('office-cleaning', 'kitchen_cleaning', 'Kitchen Cleaning', 180.00::decimal),
    ('office-cleaning', 'boardroom_cleaning', 'Boardroom Cleaning', 120.00::decimal),
    ('office-cleaning', 'bin_liner_replacement', 'Bin Liner Replacement', 80.00::decimal),
    ('office-cleaning', 'after_hours_cleaning', 'After-Hours Cleaning', 260.00::decimal),
    ('office-cleaning', 'consumables_restocking', 'Consumables Restocking', 140.00::decimal),
    ('carpet-cleaning', 'stain_removal_treatment', 'Stain Removal Treatment', 180.00::decimal),
    ('carpet-cleaning', 'pet_odour_treatment', 'Pet Odour Treatment', 220.00::decimal),
    ('carpet-cleaning', 'rug_cleaning', 'Rug Cleaning', 160.00::decimal),
    ('carpet-cleaning', 'fabric_protection', 'Fabric Protection', 240.00::decimal),
    ('carpet-cleaning', 'quick_dry_treatment', 'Quick Dry Treatment', 180.00::decimal),
    ('carpet-cleaning', 'high_traffic_area_treatment', 'High-Traffic Area Treatment', 190.00::decimal),
    ('moving-cleaning', 'garage_cleaning', 'Garage Cleaning', 220.00::decimal),
    ('moving-cleaning', 'balcony_cleaning', 'Balcony Cleaning', 160.00::decimal),
    ('moving-cleaning', 'cupboard_interior_cleaning', 'Cupboard Interior Cleaning', 200.00::decimal),
    ('moving-cleaning', 'wall_spot_cleaning', 'Wall Spot Cleaning', 180.00::decimal),
    ('moving-cleaning', 'appliance_cleaning', 'Appliance Cleaning', 260.00::decimal),
    ('moving-cleaning', 'post_renovation_dust_removal', 'Post-Renovation Dust Removal', 320.00::decimal),
    ('deep-cleaning', 'grout_scrubbing', 'Grout Scrubbing', 190.00::decimal),
    ('deep-cleaning', 'cabinet_interior_cleaning', 'Cabinet Interior Cleaning', 210.00::decimal),
    ('deep-cleaning', 'behind_appliance_cleaning', 'Behind Appliance Cleaning', 240.00::decimal),
    ('deep-cleaning', 'mould_treatment', 'Mould Treatment', 260.00::decimal),
    ('deep-cleaning', 'heavy_degreasing', 'Heavy Degreasing', 230.00::decimal),
    ('deep-cleaning', 'skirting_baseboard_cleaning', 'Skirting/Baseboard Cleaning', 170.00::decimal)
  ) as seeded(service_slug, addon_key, label, price)
  join public.services s on s.slug = seeded.service_slug
)
insert into public.service_addons (service_id, addon_key, label, price, active)
select service_id, addon_key, label, price, true
from addon_seed
on conflict (service_id, addon_key) do update set
  label = excluded.label,
  price = excluded.price,
  updated_at = now();

insert into public.pricing_history (service_id, change_type, snapshot)
select id, 'migration_seed', jsonb_build_object(
  'base_price', base_price,
  'room_price', room_price,
  'bathroom_price', bathroom_price,
  'service_fee_type', service_fee_type,
  'service_fee_amount', service_fee_amount
)
from public.services
where not exists (
  select 1
  from public.pricing_history
  where pricing_history.service_id = services.id
    and pricing_history.change_type = 'migration_seed'
);

notify pgrst, 'reload schema';
