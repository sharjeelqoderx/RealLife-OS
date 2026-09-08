-- Signup / new auth users always get role USER.
-- ADMIN is never granted on insert — only via service-role (admin panel).
-- Source of truth for authorization: raw_app_meta_data.role

create or replace function public.handle_new_auth_user_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Force USER even if client tried to pass role=ADMIN in signup metadata.
  new.raw_user_meta_data :=
    coalesce(new.raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'USER');
  new.raw_app_meta_data :=
    coalesce(new.raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'USER');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_set_role on auth.users;

create trigger on_auth_user_created_set_role
  before insert on auth.users
  for each row
  execute function public.handle_new_auth_user_role();

-- Backfill missing roles only (do not overwrite existing ADMIN).
update auth.users
set
  raw_user_meta_data =
    coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'USER')
where coalesce(raw_user_meta_data->>'role', '') = '';

update auth.users
set
  raw_app_meta_data =
    coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'USER')
where coalesce(raw_app_meta_data->>'role', '') = '';
