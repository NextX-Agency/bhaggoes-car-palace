-- User management from the dashboard, without a service-role key and without depending on email delivery:
-- administrators create colleagues with a temporary password, change access, reset passwords and remove accounts.
-- Every function checks private.is_admin() first. An administrator can never remove or demote themself, so the
-- project always keeps at least one administrator.
begin;

create or replace function public.admin_list_users()
returns table (id uuid, email text, display_name text, role text, created_at timestamptz, last_sign_in_at timestamptz, must_change_password boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (select private.is_admin()) then raise exception 'Administrator access required'; end if;
  return query
    select u.id, u.email::text, p.display_name, coalesce(p.role, 'staff'), u.created_at, u.last_sign_in_at,
      coalesce((u.raw_user_meta_data ->> 'must_change_password')::boolean, false)
    from auth.users u left join public.profiles p on p.id = u.id
    where u.deleted_at is null
    order by u.created_at;
end;
$$;

create or replace function public.admin_create_user(p_email text, p_password text, p_display_name text default null, p_role text default 'admin')
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_email text := lower(btrim(coalesce(p_email, '')));
  new_id uuid := gen_random_uuid();
begin
  if not (select private.is_admin()) then raise exception 'Administrator access required'; end if;
  if normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or length(normalized_email) > 254 then raise exception 'invalid_email'; end if;
  if length(coalesce(p_password, '')) < 12 or length(p_password) > 72 then raise exception 'invalid_password'; end if;
  if p_role not in ('admin', 'staff') then raise exception 'invalid_role'; end if;
  if exists (select 1 from auth.users u where lower(u.email) = normalized_email) then raise exception 'email_taken'; end if;

  -- Same shape as an email/password user created by Supabase Auth itself (confirmed, email identity).
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change, email_change_token_new, email_change_token_current,
    phone_change, phone_change_token, reauthentication_token
  ) values (
    '00000000-0000-0000-0000-000000000000', new_id, 'authenticated', 'authenticated', normalized_email,
    extensions.crypt(p_password, extensions.gen_salt('bf', 10)), now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    jsonb_build_object('email_verified', true, 'must_change_password', true, 'display_name', nullif(btrim(coalesce(p_display_name, '')), '')),
    now(), now(), '', '', '', '', '', '', '', ''
  );
  insert into auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
  values (new_id::text, new_id, jsonb_build_object('sub', new_id::text, 'email', normalized_email, 'email_verified', true, 'phone_verified', false), 'email', now(), now());

  -- The on_auth_user_created trigger has made the profile; give it the requested access and name.
  insert into public.profiles (id, role, display_name) values (new_id, p_role, nullif(btrim(coalesce(p_display_name, '')), ''))
  on conflict (id) do update set role = excluded.role, display_name = excluded.display_name;
  return new_id;
end;
$$;

create or replace function public.admin_update_user(p_user_id uuid, p_display_name text, p_role text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select private.is_admin()) then raise exception 'Administrator access required'; end if;
  if p_role not in ('admin', 'staff') then raise exception 'invalid_role'; end if;
  if p_user_id = (select auth.uid()) and p_role <> 'admin' then raise exception 'cannot_demote_self'; end if;
  if not exists (select 1 from auth.users u where u.id = p_user_id) then raise exception 'user_not_found'; end if;
  insert into public.profiles (id, role, display_name) values (p_user_id, p_role, nullif(btrim(coalesce(p_display_name, '')), ''))
  on conflict (id) do update set role = excluded.role, display_name = excluded.display_name;
end;
$$;

-- For a colleague who forgot their password: a new temporary password they must change after logging in.
-- Signing them out everywhere makes sure an old session cannot keep using the account.
create or replace function public.admin_set_user_password(p_user_id uuid, p_password text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select private.is_admin()) then raise exception 'Administrator access required'; end if;
  if length(coalesce(p_password, '')) < 12 or length(p_password) > 72 then raise exception 'invalid_password'; end if;
  if p_user_id = (select auth.uid()) then raise exception 'use_own_account_page'; end if;
  update auth.users
    set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf', 10)),
        raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || '{"must_change_password": true}'::jsonb,
        updated_at = now()
    where id = p_user_id;
  if not found then raise exception 'user_not_found'; end if;
  delete from auth.sessions where user_id = p_user_id;
end;
$$;

create or replace function public.admin_delete_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select private.is_admin()) then raise exception 'Administrator access required'; end if;
  if p_user_id = (select auth.uid()) then raise exception 'cannot_delete_self'; end if;
  delete from auth.users where id = p_user_id;
  if not found then raise exception 'user_not_found'; end if;
end;
$$;

revoke all on function public.admin_list_users() from public, anon;
revoke all on function public.admin_create_user(text, text, text, text) from public, anon;
revoke all on function public.admin_update_user(uuid, text, text) from public, anon;
revoke all on function public.admin_set_user_password(uuid, text) from public, anon;
revoke all on function public.admin_delete_user(uuid) from public, anon;
grant execute on function public.admin_list_users() to authenticated;
grant execute on function public.admin_create_user(text, text, text, text) to authenticated;
grant execute on function public.admin_update_user(uuid, text, text) to authenticated;
grant execute on function public.admin_set_user_password(uuid, text) to authenticated;
grant execute on function public.admin_delete_user(uuid) to authenticated;

-- Database advisor: the inquiries -> vehicles foreign key had no index.
create index if not exists inquiries_vehicle_id_idx on public.inquiries(vehicle_id);

commit;
