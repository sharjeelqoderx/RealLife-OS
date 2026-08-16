import { createAdminClient } from "@/lib/supabase/admin"
import { createLiveCloudflareProvider } from "@/lib/cloudflare/providers/live"
import type { CloudflareProvider } from "@/lib/cloudflare/provider"

/**
 * Reconcile local ownership rows with Cloudflare physical-device inventory.
 * Does not auto-assign unowned devices to customers.
 */
export async function syncCloudflareDevices(
  provider: CloudflareProvider = createLiveCloudflareProvider()
): Promise<{
  seen: number
  updated: number
  missing: number
}> {
  const admin = createAdminClient()
  const physicalDevices = await provider.listPhysicalDevices()
  const byId = new Map(physicalDevices.map((device) => [device.id, device]))

  const { data: ownedRows, error } = await admin
    .from("tenant_device_metadata")
    .select("id, user_id, cloudflare_device_id, display_name")

  if (error) {
    throw new Error("Unable to load local device ownership for sync")
  }

  let updated = 0
  let missing = 0

  for (const row of ownedRows ?? []) {
    const remote = byId.get(row.cloudflare_device_id)
    if (!remote) {
      missing += 1
      continue
    }

    const nextName = row.display_name?.trim() || remote.name?.trim() || null
    if (nextName !== row.display_name) {
      await admin
        .from("tenant_device_metadata")
        .update({
          display_name: nextName,
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id)
      updated += 1
    }
  }

  console.info("DEVICE_SYNC_COMPLETED", {
    seen: physicalDevices.length,
    updated,
    missing,
  })

  return { seen: physicalDevices.length, updated, missing }
}
