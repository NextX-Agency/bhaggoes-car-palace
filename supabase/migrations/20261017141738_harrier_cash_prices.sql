begin;

alter table public.vehicles
  add column cash_price numeric(14,2) check (cash_price is null or cash_price >= 0);

update public.site_settings
set phone = '+597 866-8777',
    whatsapp = '+597 866-8777',
    address = E'HK: Kwattaweg-Tomaatstraat 495, Suriname\nWanica: Indira Ghandiweg 50, Suriname',
    financing_enabled = true,
    financing_notes = 'Interne financiering: 70% aanbetaling, maximaal 6 maanden. Bankfinanciering: vanaf 25% aanbetaling. Inruil mogelijk.'
where id = 1;

insert into public.vehicles
  (slug, title, make, model, year, price, cash_price, currency, transmission, body_type, seats,
   condition, availability, featured, published)
select '2018-toyota-harrier', '2018 Toyota Harrier', 'Toyota', 'Harrier',
  2018, 26950, 25950, 'USD', 'Automatic', 'SUV', 5,
  'used', 'available', true, true
where not exists (
  select 1 from public.vehicles
  where make = 'Toyota' and model = 'Harrier' and year = 2018 and price = 26950
);

update public.vehicles set cash_price = 25950
where slug in ('2018-toyota-harrier-fb9c74', '2018-toyota-harrier');

insert into public.vehicle_images (vehicle_id, storage_path, alt_text, sort_order, is_cover)
select vehicle.id,
  '/images/harrier-2018/' || photo.filename,
  photo.alt_text, photo.position, photo.position = 0
from (values
  ('front-three-quarter.webp', '2018 Toyota Harrier, vooraanzicht schuin', 0),
  ('front.webp', '2018 Toyota Harrier, vooraanzicht', 1),
  ('rear.webp', '2018 Toyota Harrier, achteraanzicht', 2),
  ('cargo.webp', 'Bagageruimte van de Toyota Harrier', 3),
  ('rear-seats.webp', 'Lederen achterbank van de Toyota Harrier', 4),
  ('dashboard.webp', 'Dashboard van de Toyota Harrier', 5),
  ('cockpit.webp', 'Bediening en JBL audiosysteem van de Toyota Harrier', 6),
  ('panoramic-roof.webp', 'Panoramisch dak van de Toyota Harrier', 7)
) as photo(filename, alt_text, position)
cross join public.vehicles vehicle
where vehicle.slug = '2018-toyota-harrier'
and not exists (
  select 1 from public.vehicle_images
  where vehicle_id = vehicle.id
);

insert into public.features (name, category)
values ('Panoramic sunroof', 'other'), ('JBL sound system', 'other'),
       ('Leather seats', 'other'), ('360° camera', 'other')
on conflict (name) do nothing;

insert into public.vehicle_features (vehicle_id, feature_id)
select vehicle.id, feature.id
from public.features feature
cross join public.vehicles vehicle
where name in ('Panoramic sunroof', 'JBL sound system', 'Leather seats', '360° camera')
  and vehicle.slug in ('2018-toyota-harrier-fb9c74', '2018-toyota-harrier')
on conflict do nothing;

commit;
