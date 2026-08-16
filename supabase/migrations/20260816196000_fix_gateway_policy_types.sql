-- Align policy ownership types with the Gateway editor payload
-- (allow | block | safesearch | ytrestricted | custom).

alter table public.tenant_gateway_policies
  drop constraint if exists tenant_gateway_policies_type_check;

alter table public.tenant_gateway_policies
  add constraint tenant_gateway_policies_type_check
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
  ));
