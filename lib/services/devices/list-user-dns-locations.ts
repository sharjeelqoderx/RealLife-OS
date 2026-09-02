import { createAdminClient } from "@/lib/supabase/admin"

export type UserOwnedDnsLocation = {
  locationId: string
  displayName: string | null
}

/** Gateway DNS location IDs provisioned for this user's enrolled devices. */
export async function listUserOwnedDnsLocations(
  userId: string
): Promise<UserOwnedDnsLocation[]> {
  const { data, error } = await createAdminClient()
    .from("tenant_device_metadata")
    .select("cloudflare_location_id, display_name")
    .eq("user_id", userId)
    .not("cloudflare_location_id", "is", null)

  if (error) throw error

  const byLocationId = new Map<string, UserOwnedDnsLocation>()
  for (const row of data ?? []) {
    const locationId = row.cloudflare_location_id?.trim()
    if (!locationId || byLocationId.has(locationId)) continue
    byLocationId.set(locationId, {
      locationId,
      displayName: row.display_name,
    })
  }

  return [...byLocationId.values()]
}
