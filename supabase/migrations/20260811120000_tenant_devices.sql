-- Device display names + setup progress per tenant user (Cloudflare device IDs are external).

create table if not exists public.tenant_device_metadata (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  cloudflare_device_id text not null,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, cloudflare_device_id)
);

create index if not exists tenant_device_metadata_user_idx
  on public.tenant_device_metadata (user_id);

alter table public.tenant_device_metadata enable row level security;

create policy "Users can read own device metadata"
  on public.tenant_device_metadata
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own device metadata"
  on public.tenant_device_metadata
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own device metadata"
  on public.tenant_device_metadata
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own device metadata"
  on public.tenant_device_metadata
  for delete
  to authenticated
  using (auth.uid() = user_id);

create table if not exists public.device_setup_sessions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  platform text not null check (platform in ('android', 'iphone')),
  answers jsonb not null default '{}'::jsonb,
  cloudflare_wizard_step integer not null default 1 check (cloudflare_wizard_step between 1 and 4),
  updated_at timestamptz not null default now()
);

alter table public.device_setup_sessions enable row level security;

create policy "Users can read own device setup session"
  on public.device_setup_sessions
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can upsert own device setup session"
  on public.device_setup_sessions
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own device setup session"
  on public.device_setup_sessions
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.device_app_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  lock_filter_switch boolean not null default true,
  prevent_logout boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.device_app_preferences enable row level security;

create policy "Users can read own device app preferences"
  on public.device_app_preferences
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own device app preferences"
  on public.device_app_preferences
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own device app preferences"
  on public.device_app_preferences
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
