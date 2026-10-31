-- 1. Catalog switch: staff can take every car off the public website in one go (header, hero, footer and
--    the dealership information stay). Enforced here in row level security, so the cars are hidden from the
--    public API as well, not only from the pages. Administrators keep full access through their own policies.
-- 2. Flexible listings: a car may be saved with only photos; make and model are optional.
-- 3. Search: one lower-cased text column with every searchable detail (stock number, year, colours,
--    specifications, prices, options …), kept current by triggers and indexed for substring matching.
begin;

-- 1. Catalog switch -----------------------------------------------------------------------------------------
alter table public.site_settings
  add column if not exists catalog_hidden boolean not null default false,
  add column if not exists catalog_hidden_message text check (catalog_hidden_message is null or length(catalog_hidden_message) <= 600);

create or replace function private.catalog_public()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not coalesce((select s.catalog_hidden from public.site_settings s where s.id = 1), false);
$$;
revoke all on function private.catalog_public() from public;
grant execute on function private.catalog_public() to anon, authenticated;

drop policy if exists vehicles_public_read on public.vehicles;
create policy vehicles_public_read on public.vehicles for select to anon, authenticated
  using (
    published and archived_at is null and (select private.catalog_public()) and
    (availability <> 'sold' or coalesce((select s.show_sold from public.site_settings s where s.id = 1), false))
  );

drop policy if exists vehicle_images_public_read on public.vehicle_images;
create policy vehicle_images_public_read on public.vehicle_images for select to anon, authenticated
  using ((select private.catalog_public()) and exists (
    select 1 from public.vehicles v
    where v.id = vehicle_id and v.published and v.archived_at is null and
      (v.availability <> 'sold' or coalesce((select s.show_sold from public.site_settings s where s.id = 1), false))
  ));

drop policy if exists features_public_read on public.features;
create policy features_public_read on public.features for select to anon, authenticated
  using ((select private.catalog_public()) and exists (
    select 1 from public.vehicle_features vf
    join public.vehicles v on v.id = vf.vehicle_id
    where vf.feature_id = features.id and v.published and v.archived_at is null and
      (v.availability <> 'sold' or coalesce((select s.show_sold from public.site_settings s where s.id = 1), false))
  ));

drop policy if exists vehicle_features_public_read on public.vehicle_features;
create policy vehicle_features_public_read on public.vehicle_features for select to anon, authenticated
  using ((select private.catalog_public()) and exists (
    select 1 from public.vehicles v
    where v.id = vehicle_id and v.published and v.archived_at is null and
      (v.availability <> 'sold' or coalesce((select s.show_sold from public.site_settings s where s.id = 1), false))
  ));

drop policy if exists vehicle_images_visible_select on storage.objects;
create policy vehicle_images_visible_select on storage.objects for select to anon, authenticated
  using (
    bucket_id = 'vehicle-images' and (
      (select private.is_admin()) or ((select private.catalog_public()) and exists (
        select 1 from public.vehicle_images i
        join public.vehicles v on v.id = i.vehicle_id
        where i.storage_path = name and v.published and v.archived_at is null and
          (v.availability <> 'sold' or coalesce((select s.show_sold from public.site_settings s where s.id = 1), false))
      ))
    )
  );

-- 2. Flexible listings ----------------------------------------------------------------------------------------
alter table public.vehicles alter column make drop not null;
alter table public.vehicles alter column model drop not null;

-- 3. Search ---------------------------------------------------------------------------------------------------
create extension if not exists pg_trgm with schema extensions;

alter table public.vehicles add column if not exists search_text text not null default '';

create or replace function public.vehicles_set_search_text()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.search_text := lower(concat_ws(' ',
    new.title, new.make, new.model, new.variant, new.year::text,
    new.stock_number, regexp_replace(coalesce(new.stock_number, ''), '[^A-Za-z0-9]', '', 'g'),
    new.fuel_type, new.transmission, new.drive_type, new.body_type,
    new.exterior_color, new.interior_color, new.engine_capacity,
    case when new.seats is not null then new.seats::text || ' seats' end,
    case when new.doors is not null then new.doors::text || ' doors' end,
    new.condition, replace(new.availability, '_', ' '),
    trunc(new.price)::text, trunc(new.cash_price)::text, new.currency,
    case when new.mileage is not null then trunc(new.mileage)::text || ' km' end,
    new.description,
    (select string_agg(f.name, ' ') from public.vehicle_features vf
      join public.features f on f.id = vf.feature_id where vf.vehicle_id = new.id)
  ));
  return new;
end;
$$;
revoke all on function public.vehicles_set_search_text() from public, anon, authenticated;

drop trigger if exists vehicles_set_search_text on public.vehicles;
create trigger vehicles_set_search_text before insert or update on public.vehicles
  for each row execute function public.vehicles_set_search_text();

-- Options live in their own table, so changing them re-runs the vehicle trigger above.
create or replace function public.vehicle_features_refresh_search_text()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.vehicles v set search_text = v.search_text
  where v.id in (select distinct changed_rows.vehicle_id from changed_rows);
  return null;
end;
$$;
revoke all on function public.vehicle_features_refresh_search_text() from public, anon, authenticated;

drop trigger if exists vehicle_features_search_insert on public.vehicle_features;
create trigger vehicle_features_search_insert after insert on public.vehicle_features
  referencing new table as changed_rows
  for each statement execute function public.vehicle_features_refresh_search_text();
drop trigger if exists vehicle_features_search_delete on public.vehicle_features;
create trigger vehicle_features_search_delete after delete on public.vehicle_features
  referencing old table as changed_rows
  for each statement execute function public.vehicle_features_refresh_search_text();

-- Backfill without touching updated_at, so the "last updated" dates in the dashboard stay as they are.
alter table public.vehicles disable trigger vehicles_touch_updated_at;
update public.vehicles set search_text = '';
alter table public.vehicles enable trigger vehicles_touch_updated_at;

create index if not exists vehicles_search_text_trgm_idx on public.vehicles
  using gin (search_text extensions.gin_trgm_ops);

commit;
