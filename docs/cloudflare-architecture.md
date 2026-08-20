# Cloudflare Zero Trust Architecture

RealLife OS owns one Cloudflare Zero Trust account. Customers use the RealLife
OS dashboard; they never receive Cloudflare administrator access, the account
ID, API token, Gateway rule ID, registration credentials, or service tokens.

```
Customer → RealLife OS UI → authenticated API routes → Supabase ownership data
         → server-only Cloudflare client → shared Zero Trust organization
         → Cloudflare One Client/WARP → Gateway DNS rules
```

Supabase Auth users are the SaaS identity and database ownership source of
truth. Cloudflare identities only establish WARP enrollment. A physical device
is exposed only after a pending RealLife OS enrollment verifies the Cloudflare
enrollment email and writes the device ownership record. Browser-provided
Cloudflare device IDs are never used to establish ownership.

Gateway rule precedence is maintained by the application: lower values have
higher precedence (Cloudflare first-match). Customer rules use the Cloudflare
identity email selector and therefore require Cloudflare One Client
**Traffic and DNS** mode.

## Per-device / per-profile enforcement (Phase 1)

Application profiles (`Kids`, `Parents`, `Work`) live in Supabase
(`tenant_device_profiles`). They are **not** Cloudflare Device Settings
Profiles.

Cloudflare Gateway does **not** accept SaaS device UUIDs as selectors. Phase 1
enforcement maps each owned device to a dedicated Gateway DNS location and
scopes rules with:

- `identity.email == "<tenant email>"` (tenant isolation on the shared account)
- `dns.location in {…}` (devices that should receive the logical policy)

Official references:

- [Gateway DNS locations](https://developers.cloudflare.com/cloudflare-one/networks/resolvers-and-proxies/dns/locations/)
- [Create Gateway rule](https://developers.cloudflare.com/api/resources/zero_trust/subresources/gateway/subresources/rules/methods/create/)
- [Order of enforcement](https://developers.cloudflare.com/cloudflare-one/traffic-policies/order-of-enforcement/)
- [MDM `gateway_unique_id`](https://developers.cloudflare.com/cloudflare-one/team-and-resources/devices/cloudflare-one-client/deployment/mdm-deployment/parameters/)

Effective policy resolution (application layer):

1. Direct device assignment
2. Profile assignment
3. None

Cloudflare precedence bands:

- Device-targeted policies ≈ `100+`
- Profile-targeted policies ≈ `500+`
- Unassigned identity-wide policies ≈ `1000+`

DNS-only mode can enforce account-wide DNS rules, but cannot enforce
identity-scoped customer rules. Device traffic must use the device's DoH
subdomain (`doh_subdomain` / `gateway_unique_id`) for location-scoped DNS
policies to match.

Cloudflare's API does not carry an application enrollment ID through WARP
registration. RealLife OS therefore allows one pending enrollment per SaaS user
and associates a device only when an active Cloudflare registration has the
same enrolled email and was created after the pending enrollment began.

Cloudflare administrators must separately configure a restrictive enrollment
policy and the One-Time PIN login method. The complete manual runbook is in
[`CLOUDFLARE_DEVICE_ENROLLMENT_SETUP.md`](./CLOUDFLARE_DEVICE_ENROLLMENT_SETUP.md).
