# DNS policy management

Gateway DNS policies are created and managed only through authenticated
RealLife OS API routes. Customer-facing forms use friendly inputs such as
categories and domains; the backend is responsible for mapping them to the
Cloudflare Gateway Rules API schema and wirefilter expressions supported by
Cloudflare.

Gateway rules use `filters: ["dns"]`. Rule precedence is explicit: lower
numbers are evaluated first. The application stores customer ownership and
configuration separately from Cloudflare implementation IDs. Cloudflare rule
IDs must never be sent to customer browsers.

Administrators should treat Cloudflare dashboard edits as emergency changes.
Application-controlled rules may be reconciled by a server-side sync job; do
not silently accept or overwrite drift without an explicit policy.
