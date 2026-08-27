-- Device-level Gateway enforcement: persist enrollment identity fields,
-- allow pending local policy ownership before Cloudflare POSTs, store
-- multi-layer Gateway rule IDs, and use `configured` until live proof.

alter table public.tenant_device_metadata
  add column if not exists cloudflare_account_id text,
  add column if not exists cloudflare_registration_id text,
  add column if not exists enrollment_status text not null default 'enrolled'
    check (enrollment_status in (
      'pending',
      'enrolled',
      'disconnected',
      'revoked'
    ));

comment on column public.tenant_device_metadata.user_id is
  'SaaS tenant identifier (auth.users). There is no separate tenants table.';
comment on column public.tenant_device_metadata.cloudflare_account_id is
  'Shared Zero Trust account that owns the physical device. Server-written.';
comment on column public.tenant_device_metadata.cloudflare_registration_id is
  'Cloudflare registration claimed at enrollment. Server-written.';

-- Local ownership may exist before Cloudflare returns a rule id.
alter table public.tenant_gateway_policies
  alter column cloudflare_rule_id drop not null;

alter table public.tenant_gateway_policies
  drop constraint if exists tenant_gateway_policies_status_check;

alter table public.tenant_gateway_policies
  add constraint tenant_gateway_policies_status_check
  check (status in ('pending', 'configured', 'active', 'failed', 'deleted'));

-- UNIQUE CONSTRAINT owns the backing index; drop the constraint first.
alter table public.tenant_gateway_policies
  drop constraint if exists tenant_gateway_policies_cloudflare_rule_id_key;
drop index if exists public.tenant_gateway_policies_cloudflare_rule_id_key;

create unique index if not exists tenant_gateway_policies_cloudflare_rule_uidx
  on public.tenant_gateway_policies (cloudflare_rule_id)
  where cloudflare_rule_id is not null;

alter table public.tenant_policy_gateway_rules
  drop constraint if exists tenant_policy_gateway_rules_rule_role_check;

alter table public.tenant_policy_gateway_rules
  add constraint tenant_policy_gateway_rules_rule_role_check
  check (rule_role in (
    'primary',
    'dns',
    'http',
    'l4',
    'l4_fallback_dns',
    'assignment',
    'auxiliary'
  ));
