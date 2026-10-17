delete from public.vehicle_templates
where (name = 'SUV basis' and fields = '{"body_type":"SUV","features":[]}'::jsonb)
   or (name = 'Sedan basis' and fields = '{"body_type":"Sedan","features":[]}'::jsonb)
   or (name = 'Pickup basis' and fields = '{"body_type":"Pickup","features":[]}'::jsonb)
   or (name = 'Van basis' and fields = '{"body_type":"Van","features":[]}'::jsonb);
