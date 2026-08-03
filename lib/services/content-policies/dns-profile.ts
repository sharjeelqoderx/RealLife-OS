import { listGatewayLocations } from "@/lib/services/cloudflare/locations"
import { resolvePolicyAccountId } from "@/lib/services/content-policies/gateway-policies"
import { getTenantCloudflareAccountForUser } from "@/lib/services/tenants/provision"

export type DnsProfileSource = {
  available: boolean
  dohSubdomain: string | null
  displayName: string
  ipv4Addresses: string[]
}

/**
 * Resolve whether a Gateway DoH location exists for the current user/account.
 * Used to gate the DNS profile download button and the mobileconfig API.
 */
export async function getDnsProfileSource(
  userId: string
): Promise<DnsProfileSource> {
  const tenant = await getTenantCloudflareAccountForUser(userId)
  const accountId = await resolvePolicyAccountId(userId)

  let dohSubdomain = tenant?.dohSubdomain ?? null
  let ipv4Addresses: string[] = []
  let displayName = "RealLife OS DNS"

  if (tenant?.ipv4Destination) {
    ipv4Addresses.push(tenant.ipv4Destination)
  }
  if (tenant?.ipv4DestinationBackup) {
    ipv4Addresses.push(tenant.ipv4DestinationBackup)
  }

  if (!dohSubdomain) {
    try {
      const locations = await listGatewayLocations(accountId)
      const preferred =
        locations.find((l) => l.client_default) ?? locations[0]
      dohSubdomain = preferred?.doh_subdomain ?? null
      displayName = preferred?.name ? `${preferred.name} DNS` : displayName
      if (preferred?.ipv4_destination) {
        ipv4Addresses = [
          preferred.ipv4_destination,
          preferred.ipv4_destination_backup,
        ].filter((v): v is string => Boolean(v))
      }
    } catch (error) {
      console.warn("getDnsProfileSource: locations lookup failed:", error)
    }
  }

  return {
    available: Boolean(dohSubdomain),
    dohSubdomain,
    displayName,
    ipv4Addresses,
  }
}
