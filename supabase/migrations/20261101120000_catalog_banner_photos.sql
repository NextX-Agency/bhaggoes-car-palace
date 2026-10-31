-- Photos of the lot shown on the website while the catalog is hidden (paths in the public site-assets bucket).
alter table public.site_settings
  add column if not exists catalog_images text[] not null default '{}'
  check (cardinality(catalog_images) <= 6);
