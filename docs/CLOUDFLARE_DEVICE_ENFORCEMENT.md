# Cloudflare device-level Gateway enforcement

This document is the audit of the existing RealLife OS implementation and the
contract for device-level Secure Web Gateway enforcement. It is **not** a URL
blocker product spec.

Enforcement path:

```
DEVICE
  → Cloudflare One Client (Traffic and DNS mode)
  → Cloudflare Zero Trust organization
  → Cloudflare Gateway
  → identity-scoped policy
  → BLOCK / ALLOW / SAFESEARCH / YT RESTRICTED
```

SaaS authentication is unchanged:

```
Supabase Auth → SaaS user → tenant (user_id) → Device Enrollment
  → Cloudflare One Client / WARP → Cloudflare Zero Trust
  → Gateway policies → device protection
```

---

## CURRENT STATE

Inspected: Supabase auth, `tenant_device_metadata`, `device_enrollments`,
`tenant_gateway_policies`, `tenant_policy_gateway_rules`,
`tenant_policy_assignments`, Cloudflare Gateway rules helper, device enrollment
flow, setup UI, policy editor, Cloudflare account/team config, existing DNS
expressions, and assignment precedence.

### Already implemented (do not rewrite)

| Area | What exists |
|------|-------------|
| Auth | Supabase session on API routes. No Cloudflare login for the SaaS. |
| Shared ZT account | One platform account. Customers never receive the API token, account ID, or Gateway rule IDs. |
| Device ownership | `tenant_device_metadata.id` is the public device ID. Cloudflare physical-device IDs are never accepted from the browser. Lookup is user → metadata → requested device; fail closed. |
| Enrollment | `POST /api/devices/enrollment` registers the SaaS email on the WARP Access app, creates a 15-minute pending row, and claims a device only when Cloudflare shows a matching enrollment email + new registration. |
| Policy ownership | Public ID is `tenant_gateway_policies.id`. `cloudflare_rule_id` stays server-side. |
| Policy types | `allow`, `block`, `safesearch`, `ytrestricted` map to Gateway actions of the same names. |
| Identity scope | Every customer Gateway rule uses `identity.email == "<saas email>"`. No global “block youtube” rule. |
| Device assignment | App profiles + `tenant_policy_assignments`. Cloudflare does **not** accept SaaS device UUIDs as Gateway selectors. Phase 1 used per-device Gateway DNS locations (`dns.location`) plus identity. |
| Transaction | Compensating Cloudflare delete if local persist failed after rule create. POST is not retried. |
| Device list | Filters Cloudflare inventory by DB ownership. `active_registrations > 0` is treated as connected. |
| App preferences | `device_app_preferences` already labeled as reminders, not WARP lock. |

### Gaps vs product requirement (before this change)

1. **DNS-only Gateway rules.** Create/update used `filters: ["dns"]` only. That is not Traffic and DNS enforcement.
2. **Incomplete YouTube coverage.** Fallback host list omitted CDN/API hosts such as `googlevideo.com` and `ytimg.com`. Application selector (`any(app.ids[*] in {…})`) was used when the editor sent app IDs, but YouTube Restricted still defaulted to a short FQDN list.
3. **No fallback-DNS Network (L4) policy.** Cloudflare documents that apps can retry blocked queries against built-in resolvers (for example `8.8.8.8`). That requires a Gateway **network** policy on TCP/UDP port 53 to those resolvers — without blocking Cloudflare DNS.
4. **No HTTP Gateway layer.** HTTP rules were not created. HTTP filtering needs Traffic and DNS mode, Gateway proxy, and (for HTTPS inspection) the Cloudflare root certificate.
5. **`tenant_policy_gateway_rules` underused.** Mapping table existed but create stored only a primary DNS rule.
6. **Policy status `active` on HTTP 200.** Local rows were marked `active` because Cloudflare accepted the rule. That is configuration, not live enforcement proof.
7. **Local row after Cloudflare create.** Requirement is fail-closed local ownership **before** POST to Gateway.
8. **Device metadata incomplete.** Missing persisted Cloudflare account ID, registration ID, and enrollment status on `tenant_device_metadata` (registration ID lived only on `device_enrollments`).
9. **Setup UI mixed signals.** Intro mentioned Traffic and DNS, but the wizard still centered a DNS leak test and “Content Policy” copy. DNS leak ≠ identity-scoped Gateway match.
10. **Client mode not verified via API.** Docs told admins to set Traffic and DNS. The app did not read or ensure the default device profile `service_mode_v2.mode = warp`.
11. **No physical-device Gateway selector.** Cloudflare Gateway `device_posture` matches posture **check** UUIDs, not `devices/physical-devices/{id}`. That API was not invented.

---

## REQUIRED CHANGES

Implemented in the application (this iteration):

1. Ensure (or report) default Cloudflare One **Traffic and DNS** device profile (`service_mode_v2.mode = "warp"`). DNS-only (`1dot1`) is not treated as full device protection.
2. Create policies as **layered Gateway rules** when the action and selectors support it:
   - DNS (application selector preferred)
   - Network L4 fallback-DNS (identity-scoped, once per customer; **required** for block / ytrestricted / safesearch — create fails closed if this layer cannot be created)
   - HTTP (application/host selectors) when the action is `block` or `allow` (skipped if Cloudflare rejects HTTP, because proxy/cert may not be enabled)
3. Prefer Cloudflare Application IDs from `GET /accounts/{id}/gateway/app_types` for YouTube and other catalog apps. Domain lists are a fallback, including YouTube CDN/API hosts.
4. Insert `tenant_gateway_policies` as `pending` **before** Cloudflare POSTs. Persist every Cloudflare rule ID in `tenant_policy_gateway_rules`. Compensate with DELETE if local attach fails. Never retry POST.
5. Public status is **`configured`** after Cloudflare accepts rules. Do not call that “enforced everywhere.”
6. Persist account ID, registration ID, and enrollment status on `tenant_device_metadata`.
7. Device UI: Protection CONNECTED / NOT CONNECTED from Cloudflare registrations; Policy ACTIVE / NOT ACTIVE from assignment + configured rule; Gateway PROTECTED / NOT PROTECTED only when connected **and** the org device profile is Traffic and DNS.
8. Setup wizard: install → team → authenticate → Traffic and DNS → SaaS detects device. Preferences remain preferred settings.
9. Delete policy deletes **all** mapped Cloudflare rules (except a still-shared fallback-DNS rule used by other policies).
10. Honest copy: protection holds while the device is connected to the organization and required client settings are active.

---

## CLOUDFLARE ADMIN SETUP

Manual Zero Trust steps (API token stays server-side):

1. Confirm the Zero Trust team name/domain in `CLOUDFLARE_TEAM_NAME` / `CLOUDFLARE_TEAM_DOMAIN`.
2. WARP enrollment Access app + One-Time PIN (see `CLOUDFLARE_DEVICE_ENROLLMENT_SETUP.md`).
3. API token: Zero Trust devices read/write, Gateway rules read/write, Access apps/policies write if enrollment registration is used, Device policies read/write for profile mode.
4. **Default device profile** (Zero Trust → Team & Resources → Devices → Device profiles):
   - Service mode: **Traffic and DNS** (`warp`), not DNS-only.
   - Disable WARP auto fallback DNS (`disable_auto_fallback`).
   - Do not allow clients to switch to DNS-only (`allow_mode_switch` off) unless you have a deliberate exception.
   - Gateway proxy: enable for TCP (required for HTTP policies). Enable UDP proxy if you need QUIC/HTTP3 inspection.
   - Split tunnel: do not exclude YouTube/Google video ranges if those destinations must be filtered.
5. **TLS decryption / root certificate:** required for full HTTPS HTTP-policy inspection. Deploy via MDM where the platform allows. Unmanaged iOS/Android often cannot silently install a trusted root; document that HTTP inspection is **partial** there (SNI/network/DNS still apply).
6. Decide **Allow device to leave organization** and **Lock WARP switch**. Those are Cloudflare/MDM settings. RealLife OS cannot lock the client from a local toggle.
7. Optional MDM: `service_mode=warp`, `gateway_unique_id` for the per-device DoH location, `switch_locked`, `auto_connect`. MDM is **not** required for enrollment.

The app’s admin Cloudflare page reports whether the default profile is Traffic and DNS and can apply the documented profile fields (`warp`, `disable_auto_fallback`, `allow_mode_switch=false`) via `PATCH /accounts/{account_id}/devices/policy`.

---

## API ENDPOINTS

Customer APIs (local IDs only):

| Method | Path | Role |
|--------|------|------|
| POST | `/api/devices/enrollment` | Start pending enrollment |
| GET | `/api/devices/enrollment/:id/status` | Verify Cloudflare registration (fail closed) |
| GET | `/api/devices` | Owned devices + live protection/policy/gateway statuses |
| POST | `/api/gateway-policies` | Create layered Gateway rules; returns local policy UUID |
| PUT | `/api/gateway-policies/:policyId` | Update layers |
| DELETE | `/api/gateway-policies/:policyId` | Delete all mapped Cloudflare rules |
| GET/POST | `/api/policy-assignments` | Assign device/profile; syncs DNS `dns.location` + identity |

Cloudflare APIs used (server-only):

| Method | Path |
|--------|------|
| POST/GET/PUT/DELETE | `/accounts/{account_id}/gateway/rules` |
| GET | `/accounts/{account_id}/gateway/app_types` |
| GET/POST/DELETE | `/accounts/{account_id}/gateway/locations` |
| GET | `/accounts/{account_id}/devices/physical-devices` |
| GET | `/accounts/{account_id}/devices/registrations` |
| GET/PATCH | `/accounts/{account_id}/devices/policy` (default device profile) |

Not invented: there is no Gateway selector `device.id == "<physical device uuid>"`.
Device posture uses `device_posture.checks.passed` with **check UUIDs**.

Gateway activity logs for “this packet hit this rule” are dashboard / Logpush /
GraphQL analytics, not a simple per-rule proof API. Configuration verification
is `GET` on each created rule (enabled, expected filter/action). Live YouTube
proof requires a real enrolled device.

---

## DEVICE FLOW

1. Authenticated SaaS user starts enrollment (quota + email required).
2. Backend adds the email to the WARP enrollment Access allow policy.
3. Customer installs **Cloudflare One**, enters the **customer’s team name**, signs in with the **same email**, and uses **Traffic and DNS** mode.
4. Backend polls Cloudflare registrations/physical devices. Claim only if email matches, registration is new, device is unowned, quota still allows it.
5. Ownership row: local device ID, `user_id` (tenant), Cloudflare account ID, physical device ID, registration ID, enrollment status, timestamps.
6. A per-device Gateway DNS location is provisioned for `dns.location` targeting (not a fake local-only association).
7. Customer assigns policies. Cloudflare still evaluates **identity.email** (and DNS location for DNS rules). Local device ownership decides who may manage the device.

Installing WARP alone is not protection. The backend must see an active
registration in this organization.

---

## POLICY FLOW

1. Validate session, tenant (`user_id`), schema, and policy type.
2. Insert local `tenant_gateway_policies` (`status=pending`). If this fails, **do not** POST to Cloudflare.
3. Resolve Cloudflare account (platform). Resolve YouTube/other app IDs from the Gateway catalog when names/IDs are present.
4. POST Gateway rules (DNS required; HTTP for block/allow when Cloudflare accepts it; identity-scoped L4 fallback-DNS **required** for block / ytrestricted / safesearch). If fallback-DNS cannot be created, the policy fails closed. HTTP mapping/create failure skips that layer only. Non-idempotent; no automatic POST retry.
5. Attach all Cloudflare rule IDs in `tenant_policy_gateway_rules`. If attach fails, DELETE the Cloudflare rules just created.
6. Set local `status=configured`. Return **local** policy ID only.

Assignment sync updates DNS traffic with `dns.location` for targeted devices.
HTTP and L4 application rules remain **identity-scoped**: every device enrolled
with that customer email is in scope for those layers. That is a Cloudflare
selector limitation, not a local fake device ID.

### Precedence (lower number = first match within that Gateway filter)

| Band | Use |
|------|-----|
| 40–49 | System identity-scoped fallback-DNS L4 (must not be overridden by a customer Allow on port 53 to public resolvers) |
| 80–99 | Customer Allow (device-assigned) |
| 100–139 | Customer Block / SafeSearch / YT Restricted (device-assigned) |
| 480–499 | Profile Allow |
| 500–539 | Profile Block / restrict |
| 980–999 | Unassigned Allow |
| 1000–1039 | Unassigned Block / restrict |

DNS, L4, and HTTP are separate Gateway filters. An Allow DNS rule does not
disable the L4 fallback-DNS block.

---

## ENFORCEMENT LIMITATIONS

| Topic | Reality |
|-------|---------|
| Client mode | DNS-only cannot enforce identity HTTP/L4 the same way. Product requires Traffic and DNS. |
| Per physical device | Gateway cannot select `physical_device_id`. Identity + DNS location (DNS layer) + enrollment ownership (SaaS). |
| HTTP/HTTPS | HTTP policies need Gateway proxy. Full URL inspection needs the org root certificate. Unmanaged mobile often cannot trust that cert. |
| QUIC/HTTP3 | Needs UDP proxy / inspection where Cloudflare supports it; otherwise apps may use QUIC around HTTP inspection. DNS + L4 still apply. |
| Fallback DNS | L4 expression uses scalar `net.dst.ip in {…}` (not `any(net.dst.ip[*] in {…})` — Gateway type `Ip` does not support MapEach). Ports 53/853 to listed public resolvers. DoH/DoT to other destinations may still exist; disable WARP auto-fallback; do not block Cloudflare resolvers. |
| YouTube | Application selector + DNS domains (incl. `googlevideo.com`, `ytimg.com`) + HTTP when configured + fallback DNS. **Not** a guarantee that every YouTube binary on every OS is blocked. |
| Bypass | User can uninstall the client, leave the org (if allowed), use another device, or another network without WARP. No absolute anti-bypass without MDM. |
| `device_app_preferences` | Preferred reminders only. |
| Policy `configured` | Cloudflare stored the rule. Not proof YouTube failed on a phone. |

UI sentence:

> Cloudflare protection remains effective while the device is connected to the
> organization and the required client enforcement settings are active.

---

## TEST PLAN

Mark each cell: PASS / FAIL / PARTIAL / NOT SUPPORTED. Do not assume Windows
equals Android.

For each of Android, iOS/iPadOS, Windows, macOS:

1. Enroll Cloudflare One into this team; confirm Traffic and DNS (not DNS-only).
2. SaaS detects the device (enrollment status completed).
3. Create YouTube → Block; confirm local ID returned (no Cloudflare rule ID in the browser).
4. Confirm Cloudflare dashboard: DNS + L4 fallback-DNS + HTTP (if proxy enabled) rules exist, identity = test email, enabled.
5. Traffic tests while connected:
   - YouTube in browser
   - YouTube native app
   - YouTube link from another app
   - `googlevideo` / CDN
   - Direct DNS to `8.8.8.8:53`
   - DoH/DoT if the platform allows
   - QUIC/HTTP3 if the platform allows
6. Disconnect WARP / leave org: protection must stop; UI must show NOT CONNECTED / NOT PROTECTED.
7. Gateway logs (dashboard): expected policy name/action for a blocked query.

Live device results for this repository change: **not executed in CI**. An
operator must run the matrix on hardware. Until then, policies stay
`configured`.
