/**
 * Build exportable policy config (no Cloudflare download URL exists for Gateway rules —
 * we serialize the policy detail ourselves).
 */
export function buildPolicyConfigJson(policy: {
  id: string
  name: string
  type: string
  typeLabel: string
  status: string
  description: string | null
  enabled: boolean
  traffic: string | null
  action: string
  filters: string[]
  schedule: unknown
  precedence: number | null
  createdAt: string | null
  updatedAt: string | null
  source: string
  categories?: Array<{ id: string; label: string; groupLabel: string }>
  apps?: Array<{ id: string; label: string; groupLabel: string }>
  locations?: Array<{ id: string; label: string; groupLabel: string }>
  addresses?: Array<{ url: string; mode: string }>
}): string {
  return JSON.stringify(
    {
      version: 1,
      kind: "reallife-os.gateway-policy",
      exportedAt: new Date().toISOString(),
      policy: {
        id: policy.id,
        name: policy.name,
        type: policy.type,
        typeLabel: policy.typeLabel,
        status: policy.status,
        description: policy.description,
        enabled: policy.enabled,
        action: policy.action,
        filters: policy.filters,
        precedence: policy.precedence,
        createdAt: policy.createdAt,
        updatedAt: policy.updatedAt,
        source: policy.source,
        categories: policy.categories ?? [],
        apps: policy.apps ?? [],
        locations: policy.locations ?? [],
        addresses: policy.addresses ?? [],
        schedule: policy.schedule,
        traffic: policy.traffic,
      },
    },
    null,
    2
  )
}

export function slugifyFilename(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
  return slug || "policy"
}

/**
 * Apple DNS Settings .mobileconfig for Gateway DoH location.
 * Cloudflare does not expose a download URL — profile is generated from doh_subdomain.
 * @see https://developers.cloudflare.com/cloudflare-one/networks/resolvers-and-proxies/dns/dns-over-https/
 */
export function buildDohMobileconfig(input: {
  displayName: string
  dohSubdomain: string
  ipv4Addresses?: string[]
}): string {
  const payloadUuid = crypto.randomUUID().toUpperCase()
  const profileUuid = crypto.randomUUID().toUpperCase()
  const serverUrl = `https://${input.dohSubdomain}.cloudflare-gateway.com/dns-query`
  const addresses = input.ipv4Addresses?.filter(Boolean) ?? []

  const serverAddressesXml =
    addresses.length > 0
      ? `<key>ServerAddresses</key>
			<array>
${addresses.map((ip) => `\t\t\t\t<string>${escapeXml(ip)}</string>`).join("\n")}
			</array>`
      : ""

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>PayloadContent</key>
	<array>
		<dict>
			<key>DNSSettings</key>
			<dict>
				<key>DNSProtocol</key>
				<string>HTTPS</string>
				${serverAddressesXml}
				<key>ServerURL</key>
				<string>${escapeXml(serverUrl)}</string>
			</dict>
			<key>PayloadDescription</key>
			<string>Configures device to use RealLife OS / Cloudflare Gateway DNS filtering.</string>
			<key>PayloadDisplayName</key>
			<string>DNS Settings</string>
			<key>PayloadIdentifier</key>
			<string>com.reallifeos.dns.${payloadUuid}</string>
			<key>PayloadType</key>
			<string>com.apple.dnsSettings.managed</string>
			<key>PayloadUUID</key>
			<string>${payloadUuid}</string>
			<key>PayloadVersion</key>
			<integer>1</integer>
		</dict>
	</array>
	<key>PayloadDescription</key>
	<string>DNS over HTTPS profile for ${escapeXml(input.displayName)}</string>
	<key>PayloadDisplayName</key>
	<string>${escapeXml(input.displayName)}</string>
	<key>PayloadIdentifier</key>
	<string>com.reallifeos.dnsprofile.${profileUuid}</string>
	<key>PayloadRemovalDisallowed</key>
	<false/>
	<key>PayloadType</key>
	<string>Configuration</string>
	<key>PayloadUUID</key>
	<string>${profileUuid}</string>
	<key>PayloadVersion</key>
	<integer>1</integer>
</dict>
</plist>
`
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}
