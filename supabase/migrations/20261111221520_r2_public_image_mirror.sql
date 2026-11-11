-- Public pages use R2 only after every variant for this photo has been uploaded.
-- The existing Supabase image route remains the fallback during migration and failures.
alter table public.vehicle_images
  add column if not exists r2_ready boolean not null default false;

create or replace function public.reset_vehicle_image_r2_ready()
returns trigger language plpgsql as $$
begin
  if new.storage_path is distinct from old.storage_path then new.r2_ready := false; end if;
  return new;
end;
$$;

drop trigger if exists reset_vehicle_image_r2_ready on public.vehicle_images;
create trigger reset_vehicle_image_r2_ready before update of storage_path on public.vehicle_images
for each row execute function public.reset_vehicle_image_r2_ready();
