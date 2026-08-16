-- A WARP enrollment has no application enrollment-token field. Requiring one
-- pending attempt per SaaS user prevents ambiguous email/time-based matching.
create unique index if not exists device_enrollments_one_pending_per_user_idx
  on public.device_enrollments (user_id)
  where status = 'pending';

-- Policy ownership is mandatory before a shared-account Gateway rule can be
-- created. Do not allow a failed local write to leave an unmanageable rule.
alter table public.tenant_gateway_policies
  alter column cloudflare_rule_id set not null;
