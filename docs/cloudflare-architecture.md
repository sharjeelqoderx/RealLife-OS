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
higher precedence. Customer rules use the Cloudflare identity email selector
and therefore require Cloudflare One Client **Traffic and DNS** mode. DNS-only
mode can enforce account-wide DNS rules, but cannot enforce identity-scoped
customer rules. V1 does not advertise device-specific enforcement because no
supported device selector has been configured.

Cloudflare's API does not carry an application enrollment ID through WARP
registration. RealLife OS therefore allows one pending enrollment per SaaS user
and associates a device only when an active Cloudflare registration has the
same enrolled email and was created after the pending enrollment began.

Cloudflare administrators must separately configure a restrictive enrollment
policy and the One-Time PIN login method. The complete manual runbook is in
[`CLOUDFLARE_DEVICE_ENROLLMENT_SETUP.md`](./CLOUDFLARE_DEVICE_ENROLLMENT_SETUP.md).
