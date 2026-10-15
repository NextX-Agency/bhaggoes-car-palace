begin;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'staff' check (role in ('staff', 'admin')),
  created_at timestamptz not null default now()
);

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  );
$$;
revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to anon, authenticated;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;
revoke all on function public.handle_new_auth_user() from public, anon, authenticated;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

create table public.site_settings (
  id smallint primary key default 1 check (id = 1),
  business_name text not null default 'Bhaggoes Car Palace',
  slogan text not null default 'WE BEAT ANYBODY''S PRICES',
  phone text,
  whatsapp text,
  email text,
  address text,
  business_hours jsonb not null default '{}'::jsonb,
  social_links jsonb not null default '{}'::jsonb,
  homepage_title text not null default 'Find a car that feels right.',
  homepage_subtitle text not null default 'Great cars. Straightforward prices.',
  seo_title text not null default 'Bhaggoes Car Palace | Quality Cars, Honest Prices',
  seo_description text not null default 'Browse the Bhaggoes Car Palace vehicle inventory and contact the dealership about a car.',
  about_text text,
  financing_enabled boolean not null default false,
  financing_notes text,
  currency text,
  show_sold boolean not null default false,
  logo_path text,
  updated_at timestamptz not null default now()
);

insert into public.site_settings (id) values (1) on conflict (id) do nothing;

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  make text not null,
  model text not null,
  variant text,
  year integer check (year is null or year between 1886 and 2200),
  price numeric(14,2) check (price is null or price >= 0),
  currency text,
  mileage numeric(12,1) check (mileage is null or mileage >= 0),
  engine_capacity text,
  fuel_type text,
  transmission text,
  drive_type text,
  body_type text,
  exterior_color text,
  interior_color text,
  seats smallint check (seats is null or seats between 1 and 100),
  doors smallint check (doors is null or doors between 1 and 20),
  description text,
  condition text not null check (condition in ('new', 'used')),
  availability text not null default 'available' check (availability in ('available', 'on_the_way', 'reserved', 'sold', 'rental')),
  featured boolean not null default false,
  published boolean not null default false,
  stock_number text unique,
  archived_at timestamptz,
  search_vector tsvector generated always as (
    to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(make, '') || ' ' ||
      coalesce(model, '') || ' ' || coalesce(variant, '') || ' ' || coalesce(description, ''))
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.vehicle_private (
  vehicle_id uuid primary key references public.vehicles(id) on delete cascade,
  vin text,
  admin_notes text,
  updated_at timestamptz not null default now()
);

create table public.vehicle_images (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  storage_path text not null unique,
  alt_text text,
  sort_order smallint not null default 0 check (sort_order between 0 and 14),
  is_cover boolean not null default false,
  created_at timestamptz not null default now(),
  unique (vehicle_id, sort_order) deferrable initially deferred
);

create unique index vehicle_images_one_cover_per_vehicle
  on public.vehicle_images(vehicle_id) where is_cover;

create table public.features (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category text not null default 'other',
  created_at timestamptz not null default now()
);

create table public.vehicle_features (
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  feature_id uuid not null references public.features(id) on delete cascade,
  primary key (vehicle_id, feature_id)
);

create table public.inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 2 and 120),
  email text check (email is null or email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  phone text check (phone is null or length(btrim(phone)) between 7 and 40),
  message text not null check (length(btrim(message)) between 8 and 5000),
  vehicle_id uuid references public.vehicles(id) on delete set null,
  status text not null default 'new' check (status in ('new', 'contacted', 'closed')),
  submitted_at timestamptz not null default now()
);

create or replace function public.submit_inquiry(
  p_name text, p_email text, p_phone text, p_message text, p_vehicle_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_name text := btrim(coalesce(p_name, ''));
  normalized_email text := nullif(lower(btrim(coalesce(p_email, ''))), '');
  normalized_phone text := nullif(btrim(coalesce(p_phone, '')), '');
  normalized_message text := btrim(coalesce(p_message, ''));
  new_id uuid;
  recent_count integer;
begin
  if length(normalized_name) < 2 or length(normalized_name) > 120 then
    raise exception 'Enter a name between 2 and 120 characters';
  end if;
  if normalized_email is not null and normalized_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Enter a valid email address';
  end if;
  if normalized_phone is not null and length(regexp_replace(normalized_phone, '[^0-9]', '', 'g')) not between 7 and 20 then
    raise exception 'Enter a valid phone number';
  end if;
  if normalized_email is null and normalized_phone is null then
    raise exception 'Enter an email address or phone number';
  end if;
  if length(normalized_message) < 8 or length(normalized_message) > 5000 then
    raise exception 'Enter a message between 8 and 5000 characters';
  end if;
  if p_vehicle_id is not null and not exists (
    select 1 from public.vehicles v
    where v.id = p_vehicle_id and v.published and v.archived_at is null and
      (v.availability <> 'sold' or coalesce((select s.show_sold from public.site_settings s where s.id = 1), false))
  ) then
    raise exception 'That vehicle is no longer available';
  end if;
  if normalized_email is not null then
    perform pg_advisory_xact_lock(hashtextextended('email:' || normalized_email, 0));
  end if;
  if normalized_phone is not null then
    perform pg_advisory_xact_lock(hashtextextended('phone:' || regexp_replace(normalized_phone, '[^0-9]', '', 'g'), 0));
  end if;
  select count(*) into recent_count from public.inquiries i
    where i.submitted_at > now() - interval '1 hour'
      and ((normalized_email is not null and lower(i.email) = normalized_email)
        or (normalized_phone is not null and regexp_replace(coalesce(i.phone, ''), '[^0-9]', '', 'g') = regexp_replace(normalized_phone, '[^0-9]', '', 'g')));
  if recent_count >= 5 then
    raise exception 'Please wait before sending another inquiry';
  end if;
  insert into public.inquiries (name, email, phone, message, vehicle_id, status)
    values (normalized_name, normalized_email, normalized_phone, normalized_message, p_vehicle_id, 'new')
    returning id into new_id;
  return new_id;
end;
$$;
revoke all on function public.submit_inquiry(text, text, text, text, uuid) from public;
grant execute on function public.submit_inquiry(text, text, text, text, uuid) to anon, authenticated;

create table public.content_pages (
  slug text primary key,
  title text not null,
  body text not null default '',
  published boolean not null default false,
  seo_title text,
  seo_description text,
  updated_at timestamptz not null default now()
);

create table public.faq_items (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  sort_order integer not null default 0,
  published boolean not null default false,
  updated_at timestamptz not null default now()
);

create index vehicles_published_created_idx on public.vehicles(published, created_at desc) where archived_at is null;
create index vehicles_make_model_idx on public.vehicles(make, model);
create index vehicles_availability_idx on public.vehicles(availability);
create index vehicles_price_idx on public.vehicles(price) where published and archived_at is null;
create index vehicles_year_idx on public.vehicles(year) where published and archived_at is null;
create index vehicles_search_vector_idx on public.vehicles using gin(search_vector);
create index vehicle_images_vehicle_order_idx on public.vehicle_images(vehicle_id, sort_order);
create index vehicle_features_feature_idx on public.vehicle_features(feature_id);
create index inquiries_status_submitted_idx on public.inquiries(status, submitted_at desc);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function public.touch_updated_at() from public, anon, authenticated;

create trigger site_settings_touch_updated_at before update on public.site_settings
  for each row execute function public.touch_updated_at();
create trigger vehicles_touch_updated_at before update on public.vehicles
  for each row execute function public.touch_updated_at();
create trigger vehicle_private_touch_updated_at before update on public.vehicle_private
  for each row execute function public.touch_updated_at();
create trigger content_pages_touch_updated_at before update on public.content_pages
  for each row execute function public.touch_updated_at();
create trigger faq_items_touch_updated_at before update on public.faq_items
  for each row execute function public.touch_updated_at();

alter table public.profiles enable row level security;
alter table public.site_settings enable row level security;
alter table public.vehicles enable row level security;
alter table public.vehicle_private enable row level security;
alter table public.vehicle_images enable row level security;
alter table public.features enable row level security;
alter table public.vehicle_features enable row level security;
alter table public.inquiries enable row level security;
alter table public.content_pages enable row level security;
alter table public.faq_items enable row level security;

create policy profiles_read_self_or_admin on public.profiles for select to authenticated
  using ((select auth.uid()) = id or (select private.is_admin()));

create policy settings_public_read on public.site_settings for select to anon, authenticated using (true);
create policy settings_admin_manage on public.site_settings for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

create policy vehicles_public_read on public.vehicles for select to anon, authenticated
  using (
    published and archived_at is null and
    (availability <> 'sold' or coalesce((select s.show_sold from public.site_settings s where s.id = 1), false))
  );
create policy vehicles_admin_manage on public.vehicles for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

create policy vehicle_private_admin_manage on public.vehicle_private for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

create policy vehicle_images_public_read on public.vehicle_images for select to anon, authenticated
  using (exists (
    select 1 from public.vehicles v
    where v.id = vehicle_id and v.published and v.archived_at is null and
      (v.availability <> 'sold' or coalesce((select s.show_sold from public.site_settings s where s.id = 1), false))
  ));
create policy vehicle_images_admin_manage on public.vehicle_images for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

create policy features_public_read on public.features for select to anon, authenticated
  using (exists (
    select 1 from public.vehicle_features vf
    join public.vehicles v on v.id = vf.vehicle_id
    where vf.feature_id = features.id and v.published and v.archived_at is null and
      (v.availability <> 'sold' or coalesce((select s.show_sold from public.site_settings s where s.id = 1), false))
  ));
create policy features_admin_manage on public.features for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

create policy vehicle_features_public_read on public.vehicle_features for select to anon, authenticated
  using (exists (
    select 1 from public.vehicles v
    where v.id = vehicle_id and v.published and v.archived_at is null and
      (v.availability <> 'sold' or coalesce((select s.show_sold from public.site_settings s where s.id = 1), false))
  ));
create policy vehicle_features_admin_manage on public.vehicle_features for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

create policy inquiries_admin_read on public.inquiries for select to authenticated
  using ((select private.is_admin()));
create policy inquiries_admin_update on public.inquiries for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy inquiries_admin_delete on public.inquiries for delete to authenticated
  using ((select private.is_admin()));

create policy pages_public_read on public.content_pages for select to anon, authenticated using (published);
create policy pages_admin_manage on public.content_pages for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

create policy faqs_public_read on public.faq_items for select to anon, authenticated using (published);
create policy faqs_admin_manage on public.faq_items for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

revoke all on public.profiles, public.site_settings, public.vehicles, public.vehicle_private,
  public.vehicle_images, public.features, public.vehicle_features, public.inquiries,
  public.content_pages, public.faq_items from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

grant usage on schema public to anon, authenticated;
grant select on public.site_settings, public.vehicles, public.vehicle_images, public.features,
  public.vehicle_features, public.content_pages, public.faq_items to anon, authenticated;
grant select on public.profiles to authenticated;
grant select, insert, update, delete on public.site_settings, public.vehicles, public.vehicle_private,
  public.vehicle_images, public.features, public.vehicle_features, public.content_pages, public.faq_items to authenticated;
grant select, update, delete on public.inquiries to authenticated;
grant usage, select on all sequences in schema public to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vehicle-images', 'vehicle-images', false, 15728640,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-assets', 'site-assets', true, 5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy site_assets_public_read on storage.objects for select to anon, authenticated
  using (bucket_id = 'site-assets');
create policy site_assets_admin_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'site-assets' and (select private.is_admin()));
create policy site_assets_admin_update on storage.objects for update to authenticated
  using (bucket_id = 'site-assets' and (select private.is_admin()))
  with check (bucket_id = 'site-assets' and (select private.is_admin()));
create policy site_assets_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'site-assets' and (select private.is_admin()));

create policy vehicle_images_visible_select on storage.objects for select to anon, authenticated
  using (
    bucket_id = 'vehicle-images' and (
      (select private.is_admin()) or exists (
        select 1 from public.vehicle_images i
        join public.vehicles v on v.id = i.vehicle_id
        where i.storage_path = name and v.published and v.archived_at is null and
          (v.availability <> 'sold' or coalesce((select s.show_sold from public.site_settings s where s.id = 1), false))
      )
    )
  );
create policy vehicle_images_admin_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'vehicle-images' and (select private.is_admin()));
create policy vehicle_images_admin_update on storage.objects for update to authenticated
  using (bucket_id = 'vehicle-images' and (select private.is_admin()))
  with check (bucket_id = 'vehicle-images' and (select private.is_admin()));
create policy vehicle_images_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'vehicle-images' and (select private.is_admin()));

create or replace function public.reorder_vehicle_images(p_vehicle_id uuid, p_image_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  total_rows integer;
  matched_rows integer;
begin
  if not (select private.is_admin()) then
    raise exception 'Administrator access required';
  end if;
  select count(*) into total_rows from public.vehicle_images where vehicle_id = p_vehicle_id;
  select count(distinct provided.id) into matched_rows
    from unnest(p_image_ids) as provided(id)
    join public.vehicle_images i on i.id = provided.id and i.vehicle_id = p_vehicle_id;
  if cardinality(p_image_ids) <> total_rows or matched_rows <> total_rows or total_rows > 15 then
    raise exception 'Image order must include every vehicle image exactly once';
  end if;
  set constraints vehicle_images_vehicle_id_sort_order_key deferred;
  update public.vehicle_images set is_cover = false where vehicle_id = p_vehicle_id;
  update public.vehicle_images i
    set sort_order = (requested.position - 1)::smallint,
        is_cover = (requested.position = 1)
    from unnest(p_image_ids) with ordinality as requested(id, position)
    where i.id = requested.id and i.vehicle_id = p_vehicle_id;
end;
$$;
revoke all on function public.reorder_vehicle_images(uuid, uuid[]) from public, anon;
grant execute on function public.reorder_vehicle_images(uuid, uuid[]) to authenticated;

commit;
