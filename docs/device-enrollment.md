# Device enrollment

`POST /api/devices/enrollment` checks the authenticated account’s subscription
quota, enables One-Time PIN on the WARP enrollment Access app, registers the
SaaS user’s email on that app’s allow policy, then creates a 15-minute pending
enrollment. It returns the Cloudflare team name, the registered enrollment
email, and platform-specific Cloudflare One Client instructions.

The customer installs Cloudflare One Client (or Cloudflare One Agent), selects
Zero Trust, enters the team name, and completes Cloudflare-managed identity
authentication. The application password is never sent to Cloudflare.

The dashboard polls `GET /api/devices/enrollment/:id/status` every four
seconds for a bounded period. The endpoint is independently rate limited. The
backend retrieves registrations and physical devices, then claims exactly one
device only when its Cloudflare enrollment email matches the authenticated SaaS
account, the registration was created after the pending request, the physical
device has an active registration, and it is not already owned by another SaaS
account. The quota is checked again immediately before ownership is inserted.
No Cloudflare device or registration ID is returned to the browser.

Multiple matching registrations produce an `ambiguous` result; the application
does not choose one automatically. Other public results are `pending`,
`completed`, `expired`, and `failed`.

Physical-device inventory uses Cloudflare cursor pagination. Removal deletes
the physical device; revocation uses the physical-device revoke operation.
