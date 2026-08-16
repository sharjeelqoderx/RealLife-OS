-- Pending enrollment is the ownership proof for a physical device in the
-- shared Cloudflare Zero Trust account. A Cloudflare device is never claimed
-- from a browser-provided identifier.

create table if not exists public.device_enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  requested_device_name text not null check (char_length(requested_device_name) between 1 and 80),
  status text not null default 'pending'
    check (status in ('pending', 'active', 'failed', 'expired', 'revoked')),
  expires_at timestamptz not null,
  cloudflare_device_id text unique,
  cloudflare_registration_id text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists device_enrollments_user_status_idx
  on public.device_enrollments (user_id, status, expires_at);

alter table public.device_enrollments enable row level security;

create policy "Users can read own device enrollments"
  on public.device_enrollments for select to authenticated
  using (auth.uid() = user_id);

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  action text not null,
  resource_type text not null,
  resource_id text,
  metadata jsonb not null default '{}'::jsonb,
  ip_address inet,
  created_at timestamptz not null default now()
);

create index if not exists audit_log_user_created_idx
  on public.audit_log (user_id, created_at desc);

alter table public.audit_log enable row level security;

-- Audit entries are intentionally written only through the server-side admin
-- client. End users have no direct read/write access.
