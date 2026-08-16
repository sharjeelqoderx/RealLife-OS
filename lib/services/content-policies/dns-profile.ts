import { listGatewayLocations } from "@/lib/services/cloudflare/locations"
import { getPolicyCloudflareAccountId } from "@/lib/services/content-policies/gateway-policies"

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
  let dohSubdomain: string | null = null
  let ipv4Addresses: string[] = []
  let displayName = "RealLife OS DNS"

  let accountId: string
  try {
    accountId = await getPolicyCloudflareAccountId(userId)
  } catch (error) {
    console.warn(
      "getDnsProfileSource: Cloudflare account not configured:",
      error
    )
    return {
      available: false,
      dohSubdomain: null,
      displayName,
      ipv4Addresses,
    }
  }

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

  return {
    available: Boolean(dohSubdomain),
    dohSubdomain,
    displayName,
    ipv4Addresses,
  }
}
