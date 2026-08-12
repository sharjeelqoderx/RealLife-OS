-- Model B: one shared Zero Trust account; each Cloudflare device belongs to at most one RealLife user.

create unique index if not exists tenant_device_metadata_cloudflare_device_uidx
  on public.tenant_device_metadata (cloudflare_device_id);
