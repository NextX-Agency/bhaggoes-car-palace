create sequence public.vehicle_stock_number_seq start with 1;

grant usage on sequence public.vehicle_stock_number_seq to authenticated;

create function public.assign_vehicle_stock_number()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.stock_number is null or btrim(new.stock_number) = '' then
    new.stock_number := 'BCP-' || lpad(nextval('public.vehicle_stock_number_seq')::text, 6, '0');
  end if;
  return new;
end;
$$;

revoke all on function public.assign_vehicle_stock_number() from public, anon;
grant execute on function public.assign_vehicle_stock_number() to authenticated;

create trigger assign_vehicle_stock_number_before_insert
before insert on public.vehicles
for each row execute function public.assign_vehicle_stock_number();
