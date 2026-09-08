-- Cloudflare Gateway Logpush ingest (gateway_dns + gateway_http).
-- Mapped to owned devices via tenant_device_metadata.cloudflare_device_id.

create table if not exists public.gateway_activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  device_id uuid references public.tenant_device_metadata (id) on delete set null,
  cloudflare_device_id text not null,
  dataset text not null
    check (dataset in ('gateway_dns', 'gateway_http')),
  occurred_at timestamptz not null,
  hostname text,
  url text,
  action text,
  policy_id text,
  policy_name text,
  application_name text,
  device_name text,
  raw jsonb not null default '{}'::jsonb,
  event_fingerprint text not null,
  created_at timestamptz not null default now(),
  unique (event_fingerprint)
);

create index if not exists gateway_activity_logs_user_occurred_idx
  on public.gateway_activity_logs (user_id, occurred_at desc, id desc);

create index if not exists gateway_activity_logs_device_idx
  on public.gateway_activity_logs (device_id, occurred_at desc)
  where device_id is not null;

alter table public.gateway_activity_logs enable row level security;

create policy "Users can read own gateway activity logs"
  on public.gateway_activity_logs
  for select
  to authenticated
  using (auth.uid() = user_id);

comment on table public.gateway_activity_logs is
  'Ingested Cloudflare Gateway Logpush events. Writes via service role only.';
