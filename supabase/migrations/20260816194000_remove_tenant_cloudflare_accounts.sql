-- The SaaS uses one shared Cloudflare Zero Trust account. Per-user Cloudflare
-- child-account mappings and prospective device-policy assignment rows are not
-- part of this architecture.

drop table if exists public.policy_devices;
drop table if exists public.tenant_cloudflare_accounts;
