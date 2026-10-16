-- Customer questions currently use WhatsApp. Keep the website inquiry RPC
-- unavailable until the separate inbox feature is deliberately enabled.
revoke execute on function public.submit_inquiry(text, text, text, text, uuid) from anon, authenticated;
