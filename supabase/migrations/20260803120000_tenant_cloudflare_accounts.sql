-- Phase 1 §3.6 — Per-tenant Cloudflare account mapping (child accounts via Tenant API).
-- One Cloudflare child account per authenticated household/user.

create table if not exists public.tenant_cloudflare_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  cloudflare_account_id text not null,
  cloudflare_account_name text not null,
  account_type text check (account_type in ('standard', 'enterprise')),
  gateway_tag text,
  gateway_location_id text,
  doh_subdomain text,
  ipv4_destination text,
  ipv4_destination_backup text,
  status text not null default 'pending'
    check (status in ('pending', 'provisioning', 'ready', 'failed')),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tenant_cloudflare_accounts_status_idx
  on public.tenant_cloudflare_accounts (status);

create index if not exists tenant_cloudflare_accounts_cf_account_idx
  on public.tenant_cloudflare_accounts (cloudflare_account_id);

alter table public.tenant_cloudflare_accounts enable row level security;

create policy "Users can read own Cloudflare tenant mapping"
  on public.tenant_cloudflare_accounts
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Writes happen via service role in provision services only.

create or replace function public.set_tenant_cloudflare_accounts_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tenant_cloudflare_accounts_set_updated_at
  on public.tenant_cloudflare_accounts;

create trigger tenant_cloudflare_accounts_set_updated_at
  before update on public.tenant_cloudflare_accounts
  for each row
  execute function public.set_tenant_cloudflare_accounts_updated_at();
