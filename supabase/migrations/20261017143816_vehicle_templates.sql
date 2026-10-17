create table public.vehicle_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(trim(name)) between 2 and 80),
  fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.vehicle_templates enable row level security;

create policy vehicle_templates_admin_manage on public.vehicle_templates
  for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

revoke all on public.vehicle_templates from anon, authenticated;
grant select, insert, update, delete on public.vehicle_templates to authenticated;

insert into public.vehicle_templates (name, fields) values
  ('Toyota Harrier', '{"make":"Toyota","model":"Harrier","variant":"","fuel_type":"Gasoline","transmission":"Automatic","body_type":"SUV","seats":"5","features":["Panoramic sunroof","JBL sound system","Leather seats","360° camera"]}'::jsonb),
  ('SUV basis', '{"body_type":"SUV","features":[]}'::jsonb),
  ('Sedan basis', '{"body_type":"Sedan","features":[]}'::jsonb),
  ('Pickup basis', '{"body_type":"Pickup","features":[]}'::jsonb),
  ('Van basis', '{"body_type":"Van","features":[]}'::jsonb);
