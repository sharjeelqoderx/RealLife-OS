-- Per-account device cap (required). Self-serve plans sync this from plan catalog;
-- Enterprise deals set an explicit positive integer per account.

alter table public.user_subscriptions
  add column if not exists device_limit integer;

-- Backfill any nulls before enforcing NOT NULL (trial default = 1).
update public.user_subscriptions
set device_limit = 1
where device_limit is null;

alter table public.user_subscriptions
  alter column device_limit set default 1;

alter table public.user_subscriptions
  alter column device_limit set not null;

alter table public.user_subscriptions
  drop constraint if exists user_subscriptions_device_limit_check;

alter table public.user_subscriptions
  add constraint user_subscriptions_device_limit_check
  check (device_limit > 0);

comment on column public.user_subscriptions.device_limit is
  'Required per-account device cap. Synced from plan catalog for self-serve; set explicitly for Enterprise deals.';
