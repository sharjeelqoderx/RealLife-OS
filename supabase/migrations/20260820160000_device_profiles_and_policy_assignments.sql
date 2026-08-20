-- Application profiles (Kids / Parents / Work) + policy assignments.
-- Cloudflare enforcement uses per-device Gateway DNS locations (dns.location),
-- not physical-device IDs (unsupported as Gateway selectors).
-- @see https://developers.cloudflare.com/cloudflare-one/networks/resolvers-and-proxies/dns/locations/
-- @see https://developers.cloudflare.com/cloudflare-one/traffic-policies/resolver-policies/

-- Per-device DNS location binding (DoH subdomain / gateway_unique_id)
alter table public.tenant_device_metadata
  add column if not exists cloudflare_location_id text,
  add column if not exists doh_subdomain text;

create unique index if not exists tenant_device_metadata_location_uidx
  on public.tenant_device_metadata (cloudflare_location_id)
  where cloudflare_location_id is not null;

-- Application-level profiles (not Cloudflare Device Settings Profiles)
create table if not exists public.tenant_device_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  description text check (
    description is null or char_length(description) <= 500
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

create index if not exists tenant_device_profiles_user_idx
  on public.tenant_device_profiles (user_id);

alter table public.tenant_device_profiles enable row level security;

create policy "Users can read own device profiles"
  on public.tenant_device_profiles for select to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own device profiles"
  on public.tenant_device_profiles for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own device profiles"
  on public.tenant_device_profiles for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own device profiles"
  on public.tenant_device_profiles for delete to authenticated
  using (auth.uid() = user_id);

-- One profile membership per device (device moved between profiles replaces row)
create table if not exists public.tenant_device_profile_members (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null
    references public.tenant_device_profiles (id) on delete cascade,
  device_id uuid not null
    references public.tenant_device_metadata (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (profile_id, device_id),
  unique (device_id)
);

create index if not exists tenant_device_profile_members_profile_idx
  on public.tenant_device_profile_members (profile_id);

create index if not exists tenant_device_profile_members_device_idx
  on public.tenant_device_profile_members (device_id);

alter table public.tenant_device_profile_members enable row level security;

-- Membership writes go through service-role; users can read own via profile ownership.
create policy "Users can read own profile members"
  on public.tenant_device_profile_members for select to authenticated
  using (
    exists (
      select 1
      from public.tenant_device_profiles p
      where p.id = profile_id and p.user_id = auth.uid()
    )
  );

-- Policy → device | profile assignments + Cloudflare sync state
create table if not exists public.tenant_policy_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  policy_id uuid not null
    references public.tenant_gateway_policies (id) on delete cascade,
  target_type text not null check (target_type in ('device', 'profile')),
  target_id uuid not null,
  precedence integer not null default 500,
  sync_status text not null default 'pending'
    check (sync_status in ('pending', 'active', 'sync_failed')),
  sync_error text,
  cloudflare_rule_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, policy_id, target_type, target_id)
);

create index if not exists tenant_policy_assignments_user_idx
  on public.tenant_policy_assignments (user_id);

create index if not exists tenant_policy_assignments_policy_idx
  on public.tenant_policy_assignments (policy_id);

create index if not exists tenant_policy_assignments_target_idx
  on public.tenant_policy_assignments (target_type, target_id);

create index if not exists tenant_policy_assignments_cf_rule_idx
  on public.tenant_policy_assignments (cloudflare_rule_id)
  where cloudflare_rule_id is not null;

alter table public.tenant_policy_assignments enable row level security;

create policy "Users can read own policy assignments"
  on public.tenant_policy_assignments for select to authenticated
  using (auth.uid() = user_id);

-- Cloudflare rule ID map for multi-rule / reconciliation (optional extras
-- beyond tenant_gateway_policies.cloudflare_rule_id primary rule)
create table if not exists public.tenant_policy_gateway_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  policy_id uuid not null
    references public.tenant_gateway_policies (id) on delete cascade,
  cloudflare_rule_id text not null,
  rule_role text not null default 'primary'
    check (rule_role in ('primary', 'assignment', 'auxiliary')),
  target_type text check (
    target_type is null or target_type in ('device', 'profile', 'account')
  ),
  target_id uuid,
  sync_status text not null default 'active'
    check (sync_status in ('pending', 'active', 'sync_failed', 'deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cloudflare_rule_id)
);

create index if not exists tenant_policy_gateway_rules_policy_idx
  on public.tenant_policy_gateway_rules (policy_id);

create index if not exists tenant_policy_gateway_rules_user_idx
  on public.tenant_policy_gateway_rules (user_id);

alter table public.tenant_policy_gateway_rules enable row level security;

create policy "Users can read own policy gateway rules"
  on public.tenant_policy_gateway_rules for select to authenticated
  using (auth.uid() = user_id);
