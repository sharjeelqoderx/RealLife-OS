# API reference

All routes derive the user from the Supabase session. Responses from the new
enrollment routes follow `{ success, data }` on success and
`{ success: false, error: { code, message } }` on failure.

## Devices

- `GET /api/devices` — returns only owned devices. Public device IDs are local
  `tenant_device_metadata.id` values; Cloudflare physical-device IDs remain
  server-side.
- `POST /api/devices/enrollment` — validates quota and begins a pending WARP
  enrollment. Body: `{ "deviceName": "Laptop" }`.
- `GET /api/devices/enrollment/:id/status` — rate-limited check of enrollment
  state (`pending`, `completed`, `expired`, `failed`, or `ambiguous`).
- `PATCH /api/devices/:id` — changes the local display name.
- `DELETE /api/devices/:id` — deletes an owned physical device.
- `POST /api/devices/:id/revoke` — revokes an owned physical device.

## Gateway policies

The `/api/gateway-policies` routes provide authenticated Gateway rule
list/create/read/update/delete behavior. Each rule is recorded in
`tenant_gateway_policies` and scoped to the signed-in customer with a
Cloudflare identity expression. The shared Cloudflare account is never exposed
to customers. Public policy route IDs are `tenant_gateway_policies.id`;
Cloudflare Gateway rule IDs remain server-side only.

## Administration

Admin health, inventory, registration, rule, synchronization, user, and audit
routes must be guarded by an application administrator role. The current
customer routes are not administrator routes.
