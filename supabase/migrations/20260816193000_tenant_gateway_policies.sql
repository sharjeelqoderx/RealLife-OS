-- Per-customer Gateway policy ownership on the shared Zero Trust account.
-- Cloudflare rule IDs stay server-side; customers never receive them.

create table if not exists public.tenant_gateway_policies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  description text,
  type text not null default 'custom'
    check (type in (
      'allow',
      'block',
      'safesearch',
      'ytrestricted',
      'custom',
      'category_block',
      'category_allow',
      'domain_block',
      'domain_allow'
    )),
  cloudflare_rule_id text not null unique,
  action text not null check (action in ('allow', 'block', 'safesearch', 'ytrestricted')),
  enabled boolean not null default true,
  precedence integer not null default 1000,
  configuration_json jsonb not null default '{}'::jsonb,
  status text not null default 'active'
    check (status in ('pending', 'active', 'failed', 'deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tenant_gateway_policies_user_idx
  on public.tenant_gateway_policies (user_id, status);

alter table public.tenant_gateway_policies enable row level security;

create policy "Users can read own gateway policies"
  on public.tenant_gateway_policies for select to authenticated
  using (auth.uid() = user_id);

