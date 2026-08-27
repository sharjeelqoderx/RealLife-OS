# DNS policy management

Gateway DNS policies are created and managed only through authenticated
RealLife OS API routes. Customer-facing forms use friendly inputs such as
categories and domains; the backend is responsible for mapping them to the
Cloudflare Gateway Rules API schema and wirefilter expressions supported by
Cloudflare.

Gateway rules use `filters: ["dns"]` for DNS, `["http"]` for HTTP, and
`["l4"]` for fallback-DNS network protection. Rule precedence is explicit:
lower numbers are evaluated first within that filter. Customer ownership and
configuration stay in Supabase. Cloudflare rule IDs must never be sent to
customer browsers. Policy status `configured` means Cloudflare accepted the
rule; it is not live traffic proof.

Administrators should treat Cloudflare dashboard edits as emergency changes.
Application-controlled rules may be reconciled by a server-side sync job; do
not silently accept or overwrite drift without an explicit policy.
