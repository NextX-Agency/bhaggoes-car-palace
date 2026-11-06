-- The unique order constraint is initially deferred. With an empty search_path,
-- SET CONSTRAINTS using its unqualified name failed on every upload.
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

-- Earlier failed calls left gaps and no cover image. Keep the existing order.
with missing_cover as (
  select vehicle_id from public.vehicle_images
  group by vehicle_id having not bool_or(is_cover)
), ranked as (
  select i.id, (row_number() over (partition by i.vehicle_id order by i.sort_order, i.created_at, i.id) - 1)::smallint as position
  from public.vehicle_images i join missing_cover m on m.vehicle_id = i.vehicle_id
)
update public.vehicle_images i
set sort_order = ranked.position, is_cover = ranked.position = 0
from ranked where i.id = ranked.id;

-- The customer searched for zero, but this stock number contained the letter O.
update public.vehicles
set stock_number = 'SIN-06'
where stock_number = 'SIN-O6'
  and not exists (select 1 from public.vehicles where stock_number = 'SIN-06');
