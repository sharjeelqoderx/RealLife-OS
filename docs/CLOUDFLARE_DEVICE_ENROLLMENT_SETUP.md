# Cloudflare device enrollment setup

## Scope and trust boundary

RealLife OS uses one shared Cloudflare Zero Trust organization. The SaaS
authenticates the customer with Supabase; Cloudflare authenticates the user's
WARP enrollment identity; the backend claims a device only when the two email
addresses match. Cloudflare, not RealLife OS, creates WARP physical devices and
registrations.

This guide is a **manual Cloudflare administrator runbook**. The application
does not create identity providers, WARP enrollment applications, enrollment
policies, or device profiles automatically.

## 1. Create or confirm the Zero Trust organization

In Cloudflare Zero Trust, create or open the organization's team. Record only
the team name/domain in server environment variables:

```env
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_API_TOKEN=
CLOUDFLARE_TEAM_NAME=
CLOUDFLARE_TEAM_DOMAIN=
```

Do not add these values to `NEXT_PUBLIC_*` variables. The team name is safe to
show during client setup; the account ID and API token are not.

## 2. Configure the One-Time PIN identity provider

Unless a third-party identity provider is already intentionally configured for
the product, add Cloudflare One-Time PIN:

1. Go to **Zero Trust → Integrations → Identity providers**.
2. Select **Add new identity provider**.
3. Choose **One-time PIN**.
4. Name it `One-time PIN login` and save it.

The documented API is `POST /accounts/{account_id}/access/identity_providers`
with `{ "name": "One-time PIN login", "type": "onetimepin", "config": {} }`.
RealLife OS deliberately does not call this endpoint on startup. If an admin
automation is added later, it must be explicit, admin-only, and first list the
configured providers so it cannot create duplicates.

## 3. Create or audit the WARP enrollment application

In **Zero Trust → Team & Resources → Devices → Device profiles → Management →
Device enrollment permissions**, create or edit the enrollment configuration.
Cloudflare represents WARP enrollment as an Access application of type `warp`.
Reuse an existing WARP enrollment application; do not create a second one.

Select **One-Time PIN** as its login method. Enable **Apply instant
authentication** only when One-Time PIN is the sole deliberate login method and
an administrator has verified the direct OTP redirect. Otherwise, leave it
disabled so users can select the approved method.

Do not use service-token enrollment for customer devices. It lacks the real
user identity needed by `identity.email` Gateway policies.

## 4. Restrict enrollment permissions

The enrollment policy must not be an allow-all rule and must not rely on
**Cloudflare Account Member** for SaaS customers.

Choose one restrictive, administrator-maintained authorization strategy:

- an explicit approved-email list,
- approved customer email domains, when all customers use controlled domains,
- groups from an already-configured third-party IdP.

One-Time PIN verifies that a mailbox is controlled; it does **not**
synchronize every Supabase user by itself. Cloudflare only emails a PIN when
the address is allowed on the **WARP enrollment** Access application
(`type: warp`). The login screen still says a code was sent even when it was
not.

`CLOUDFARE_APP_ID` is the content-policy Access app and must not be used for
device enrollment. When a customer starts setup, RealLife OS:

1. Finds the WARP enrollment app (`CLOUDFLARE_WARP_APP_ID` /
   `CLOUDFARE_WARP_APP_ID` if set, otherwise `type: warp`).
2. Creates the One-Time PIN identity provider if it is missing.
3. Enables that provider on the WARP app (instant auth when OTP is the only
   method).
4. Adds the authenticated SaaS email to the managed policy
   `RealLife OS SaaS device enrollment`.

Customers are not sent to the Cloudflare dashboard to register their email.

The API token needs `Access: Apps and Policies Write` and
`Access: Organizations, Identity Providers, and Groups Write`.

## 5. Configure client mode and leaving behavior

Configure the device profile used by enrolled customer devices:

- Use **Traffic and DNS** mode. DNS-only is not equivalent and cannot enforce
  identity-scoped policies such as `identity.email == "john@example.com"`.
- Decide **Allow device to leave organization** deliberately. Set it to
  disabled (`allowed_to_leave: false`) only if product policy requires users
  not to log out from the organization and the administrator has tested each
  supported platform. This Cloudflare setting, not the RealLife OS dashboard,
  controls whether manually enrolled clients can leave.
- Any auto-connect, locked switch, or MDM profile is a Cloudflare/MDM
  administrator configuration. The SaaS app's device preferences are reminders,
  not enforcement.

MDM, Android managed mode, and Apple supervision are optional advanced
protection. They must not be required for normal enrollment.

## 6. Gateway policy requirements

RealLife OS creates Gateway DNS rules with `filters: ["dns"]` and an
identity-email selector. The backend stores Cloudflare rule IDs only in
`tenant_gateway_policies`; browsers receive the local policy UUID. A rule being
deployed only means Cloudflare accepted it. It does not prove that a particular
device query matched the rule.

## 7. Cloudflare API permissions

The server-side API token needs only the permissions used by enabled features:

- Zero Trust Devices read/write for physical-device and registration inventory,
  revoke, and deletion.
- Zero Trust Gateway read/write for Gateway DNS rules and catalogs.
- Access: Organizations read for the optional team-name lookup.
- Access: Organizations, Identity Providers, and Groups write only for an
  explicitly implemented admin provisioning operation.

Never expose this token, Cloudflare physical device IDs, registration IDs, or
Gateway rule IDs to customer browser code.

## Automated SaaS operations

After an administrator completes the setup above, RealLife OS:

1. Creates a local 15-minute pending enrollment after Supabase authentication,
   quota checks, one-pending-enrollment enforcement, and rate limiting.
2. Registers the authenticated SaaS email on the Cloudflare WARP enrollment
   Access policy via API (creates/updates the managed allow policy).
3. Shows the team name and platform-specific Cloudflare One instructions.
4. Polls a rate-limited status endpoint.
5. Lists Cloudflare registrations and physical devices server-side.
6. Claims exactly one active device only when registration email and timing
   match the authenticated SaaS user, the local owner record is available, and
   the quota still has capacity.

It returns `ambiguous` when multiple registrations match and never picks one
automatically.

## Testing procedure

Use a non-production test user whose email is present in both the SaaS and the
restrictive Cloudflare enrollment policy:

1. Start **Add device** in RealLife OS.
2. Install Cloudflare One and enter the configured team name.
3. Request the One-Time PIN using the same SaaS email.
4. Complete enrollment in **Traffic and DNS** mode.
5. Confirm Cloudflare created a registration and physical device.
6. Confirm the SaaS marks the local enrollment `completed` and only that user
   sees the device.
7. Create an identity-scoped Gateway DNS rule and test a matching DNS request.
8. Use Cloudflare Gateway logs/analytics, where available, to verify the
   request and action. Do not treat a successful enrollment or DNS leak test as
   proof of rule evaluation.
