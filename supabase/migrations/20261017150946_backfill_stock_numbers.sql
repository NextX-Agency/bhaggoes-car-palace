update public.vehicles
set stock_number = 'BCP-' || lpad(nextval('public.vehicle_stock_number_seq')::text, 6, '0')
where stock_number is null;
