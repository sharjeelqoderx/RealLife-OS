import { createAdminClient } from "@/lib/supabase/admin"
import { listGatewayLocations } from "@/lib/services/cloudflare/locations"
import { getPolicyCloudflareAccountId } from "@/lib/services/content-policies/gateway-policies"
import { ensureDeviceDnsLocation } from "@/lib/services/devices/device-dns-location"

export type DnsProfileSource = {
  available: boolean
  dohSubdomain: string | null
  displayName: string
  ipv4Addresses: string[]
  deviceId?: string | null
}

/**
 * Resolve Gateway DoH endpoint for DNS profile download.
 * Prefer a specific owned device's location when `deviceId` is provided —
 * required for `dns.location` scoped Gateway policies to match.
 */
export async function getDnsProfileSource(
  userId: string,
  deviceId?: string | null
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
      deviceId: deviceId ?? null,
    }
  }

  if (deviceId) {
    const admin = createAdminClient()
    const { data: device } = await admin
      .from("tenant_device_metadata")
      .select("id, display_name, cloudflare_location_id, doh_subdomain")
      .eq("id", deviceId)
      .eq("user_id", userId)
      .maybeSingle()

    if (device) {
      let locationId = device.cloudflare_location_id
      let subdomain = device.doh_subdomain
      if (!locationId || !subdomain) {
        const ensured = await ensureDeviceDnsLocation({
          accountId,
          userId,
          deviceId: device.id,
          displayName: device.display_name ?? "Device",
        })
        locationId = ensured.locationId
        subdomain = ensured.dohSubdomain
      }
      dohSubdomain = subdomain
      displayName = `${device.display_name?.trim() || "Device"} DNS`
      return {
        available: Boolean(dohSubdomain),
        dohSubdomain,
        displayName,
        ipv4Addresses,
        deviceId,
      }
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
    deviceId: deviceId ?? null,
  }
}
