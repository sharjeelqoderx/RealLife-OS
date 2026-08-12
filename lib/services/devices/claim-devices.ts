import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { getSubscriptionDeviceLimit } from "@/lib/services/billing/plan-limits"
import { getSubscriptionByUserId } from "@/lib/services/billing/subscriptions"
import type { CloudflarePhysicalDevice } from "@/lib/services/cloudflare/devices"
import { asSubscriptionStatus, hasActiveAccess } from "@/types/billing"

type OwnershipRow = {
  user_id: string
  cloudflare_device_id: string
  display_name: string | null
}

function deviceEmail(device: CloudflarePhysicalDevice): string | null {
  const email =
    device.last_seen_user?.email ??
    device.last_seen_registration?.last_seen_user?.email
  return email?.trim().toLowerCase() || null
}

/**
 * Claim unowned Cloudflare devices whose WARP login email matches this user.
 * Ownership lives in `tenant_device_metadata` (shared Zero Trust account).
 */
export async function claimMatchingDevicesForUser(
  userId: string,
  physicalDevices: CloudflarePhysicalDevice[]
): Promise<Map<string, string | null>> {
  const admin = createAdminClient()
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const userEmail = user?.email?.trim().toLowerCase() ?? null
  const displayByDeviceId = new Map<string, string | null>()

  if (physicalDevices.length === 0) {
    return displayByDeviceId
  }

  const deviceIds = physicalDevices.map((device) => device.id)
  const { data: ownershipRows, error: ownershipError } = await admin
    .from("tenant_device_metadata")
    .select("user_id, cloudflare_device_id, display_name")
    .in("cloudflare_device_id", deviceIds)

  if (ownershipError) {
    console.warn(
      "claimMatchingDevicesForUser: ownership lookup failed:",
      ownershipError.message
    )
  }

  const rows = (ownershipRows as OwnershipRow[] | null) ?? []
  const ownerByDevice = new Map(
    rows.map((row) => [row.cloudflare_device_id, row.user_id] as const)
  )

  for (const row of rows) {
    if (row.user_id === userId) {
      displayByDeviceId.set(row.cloudflare_device_id, row.display_name)
    }
  }

  const row = await getSubscriptionByUserId(userId)
  const status = asSubscriptionStatus(row?.status)
  const hasAccess = hasActiveAccess(status, row?.current_period_end)
  if (!hasAccess || !userEmail) {
    return displayByDeviceId
  }

  const { deviceLimit } = getSubscriptionDeviceLimit(row)
  if (deviceLimit < 1) {
    return displayByDeviceId
  }

  let ownedCount = displayByDeviceId.size
  const now = new Date().toISOString()

  for (const device of physicalDevices) {
    if (ownedCount >= deviceLimit) {
      break
    }

    const existingOwner = ownerByDevice.get(device.id)
    if (existingOwner) {
      continue
    }

    if (deviceEmail(device) !== userEmail) {
      continue
    }

    const { error: insertError } = await admin
      .from("tenant_device_metadata")
      .insert({
        user_id: userId,
        cloudflare_device_id: device.id,
        display_name: device.name?.trim() || null,
        updated_at: now,
      })

    if (insertError) {
      // Another user won the race, or unique constraint blocked steal.
      console.warn(
        "claimMatchingDevicesForUser: claim skipped:",
        insertError.message
      )
      continue
    }

    ownerByDevice.set(device.id, userId)
    displayByDeviceId.set(device.id, device.name?.trim() || null)
    ownedCount += 1
  }

  return displayByDeviceId
}
