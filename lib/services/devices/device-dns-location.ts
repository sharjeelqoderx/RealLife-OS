import {
  createGatewayLocation,
  deleteGatewayLocation,
} from "@/lib/services/cloudflare/locations"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * Ensure the owned device has a dedicated Gateway DNS location.
 * Cloudflare Gateway matches DNS via `dns.location` / DoH subdomain
 * (`gateway_unique_id`), not physical-device IDs.
 *
 * @see https://developers.cloudflare.com/cloudflare-one/networks/resolvers-and-proxies/dns/locations/
 * @see https://developers.cloudflare.com/cloudflare-one/team-and-resources/devices/cloudflare-one-client/deployment/mdm-deployment/parameters/
 */
export async function ensureDeviceDnsLocation(input: {
  accountId: string
  userId: string
  deviceId: string
  displayName: string
}): Promise<{ locationId: string; dohSubdomain: string | null }> {
  const admin = createAdminClient()
  const { data: row, error } = await admin
    .from("tenant_device_metadata")
    .select("id, cloudflare_location_id, doh_subdomain, display_name")
    .eq("id", input.deviceId)
    .eq("user_id", input.userId)
    .maybeSingle()

  if (error) throw error
  if (!row) throw new Error("Device not found")

  if (row.cloudflare_location_id) {
    return {
      locationId: row.cloudflare_location_id,
      dohSubdomain: row.doh_subdomain,
    }
  }

  const safeName = (input.displayName || row.display_name || "Device")
    .trim()
    .slice(0, 60)
  const location = await createGatewayLocation(input.accountId, {
    name: `RL · ${safeName} · ${input.deviceId.slice(0, 8)}`,
    clientDefault: false,
    enableDoh: true,
    enableDot: true,
  })

  if (!location.id) {
    throw new Error("Cloudflare did not return a Gateway location id")
  }

  const { error: updateError } = await admin
    .from("tenant_device_metadata")
    .update({
      cloudflare_location_id: location.id,
      doh_subdomain: location.doh_subdomain ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.deviceId)
    .eq("user_id", input.userId)

  if (updateError) throw updateError

  return {
    locationId: location.id,
    dohSubdomain: location.doh_subdomain ?? null,
  }
}

export async function deleteDeviceDnsLocation(input: {
  accountId: string
  locationId: string | null | undefined
}): Promise<void> {
  if (!input.locationId) return
  try {
    await deleteGatewayLocation(input.accountId, input.locationId)
  } catch (error) {
    console.error("deleteDeviceDnsLocation failed:", error)
  }
}
