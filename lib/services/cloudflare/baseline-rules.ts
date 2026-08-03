import {
  createGatewayRule,
  type GatewayRule,
} from "@/lib/services/cloudflare/rules"

/**
 * Known public DoH hostnames blocked in Phase 1 anti-bypass (§3.5).
 * Devices should use the tenant's Gateway location exclusively.
 */
const DOH_PROVIDER_HOSTNAMES = [
  "dns.google",
  "dns.google.com",
  "cloudflare-dns.com",
  "mozilla.cloudflare-dns.com",
  "chrome.cloudflare-dns.com",
  "dns.quad9.net",
  "dns.adguard.com",
  "dns-family.adguard.com",
  "doh.opendns.com",
  "doh.cleanbrowsing.org",
  "dns.nextdns.io",
  "doh.dns.sb",
  "doh.li",
] as const

function buildHostnameOrExpression(hostnames: readonly string[]): string {
  return hostnames
    .map((host) => `dns.fqdn == "${host}"`)
    .join(" or ")
}

/**
 * Seed Phase 1 baseline DNS policies on a newly provisioned child account:
 * - Block known DoH providers (anti-bypass)
 * - Enforce SafeSearch on major search engines
 */
export async function seedBaselineDnsPolicies(
  accountId: string
): Promise<GatewayRule[]> {
  const created: GatewayRule[] = []

  const dohBlock = await createGatewayRule(accountId, {
    name: "Phase1 — Block public DoH providers",
    description:
      "Anti-bypass: block well-known DNS-over-HTTPS resolvers so devices use platform DNS.",
    action: "block",
    filters: ["dns"],
    precedence: 10,
    traffic: buildHostnameOrExpression(DOH_PROVIDER_HOSTNAMES),
  })
  created.push(dohBlock)

  const safeSearch = await createGatewayRule(accountId, {
    name: "Phase1 — Enforce SafeSearch",
    description: "Force SafeSearch on major search engines.",
    action: "safesearch",
    filters: ["dns"],
    precedence: 20,
    traffic: [
      'dns.fqdn == "www.google.com"',
      'dns.fqdn == "google.com"',
      'dns.fqdn == "www.bing.com"',
      'dns.fqdn == "bing.com"',
      'dns.fqdn == "duckduckgo.com"',
    ].join(" or "),
  })
  created.push(safeSearch)

  const ytRestricted = await createGatewayRule(accountId, {
    name: "Phase1 — YouTube Restricted Mode",
    description: "Enforce YouTube Restricted Mode for family-safe video.",
    action: "ytrestricted",
    filters: ["dns"],
    precedence: 21,
    traffic: [
      'dns.fqdn == "youtube.com"',
      'dns.fqdn == "www.youtube.com"',
      'dns.fqdn == "m.youtube.com"',
      'dns.fqdn == "youtu.be"',
    ].join(" or "),
  })
  created.push(ytRestricted)

  return created
}
