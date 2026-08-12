import { createAdminClient } from "@/lib/supabase/admin"
import {
  listPhysicalDevices,
  type CloudflarePhysicalDevice,
} from "@/lib/services/cloudflare/devices"
import { claimMatchingDevicesForUser } from "@/lib/services/devices/claim-devices"
import {
  DeviceServiceError,
  getDeviceAccountContext,
  mapCloudflareDeviceType,
  minutesSince,
  requireAuthenticatedUserId,
} from "@/lib/services/devices/context"
import type { ConnectedDevice } from "@/schemas/devices/device"

function getDeviceDisplayName(
  device: CloudflarePhysicalDevice,
  metadata: Map<string, string | null>
): string {
  const override = metadata.get(device.id)
  if (override?.trim()) {
    return override.trim()
  }

  if (device.name?.trim()) {
    return device.name.trim()
  }

  const userName = device.last_seen_registration?.last_seen_user?.name?.trim()
  if (userName) {
    return userName
  }

  const model = device.model?.trim()
  if (model) {
    return model
  }

  return `Device ${device.id.slice(0, 8)}`
}

function mapPhysicalDevice(
  device: CloudflarePhysicalDevice,
  metadata: Map<string, string | null>
): ConnectedDevice {
  const platform = mapCloudflareDeviceType(device.device_type)
  const lastSeenIso =
    device.last_seen_at ??
    device.last_seen_registration?.last_seen ??
    device.last_seen
  const hasActiveRegistration = (device.active_registrations ?? 0) > 0

  return {
    id: device.id,
    registrationId: device.last_seen_registration?.id ?? null,
    name: getDeviceDisplayName(device, metadata),
    platform: platform === "unknown" ? "iphone" : platform,
    status: hasActiveRegistration ? "active" : "inactive",
    lastSeenMinutes: minutesSince(lastSeenIso),
    deviceType: device.device_type ?? null,
    model: device.model ?? null,
    osVersion: device.os_version ?? null,
    userEmail:
      device.last_seen_user?.email ??
      device.last_seen_registration?.last_seen_user?.email ??
      null,
  }
}

/**
 * Devices for the signed-in user only (DB ownership on shared Zero Trust account).
 * Auto-claims unowned CF devices whose WARP login email matches this user.
 */
export async function listConnectedDevices(): Promise<ConnectedDevice[]> {
  const userId = await requireAuthenticatedUserId()
  const { accountId, tenantReady } = await getDeviceAccountContext(userId)

  if (!tenantReady) {
    return []
  }

  let physicalDevices: CloudflarePhysicalDevice[] = []
  try {
    physicalDevices = await listPhysicalDevices(accountId)
  } catch (error) {
    console.error("listConnectedDevices: Cloudflare devices failed:", error)
    throw new DeviceServiceError(
      error instanceof Error
        ? error.message
        : "Failed to load devices from Cloudflare",
      502,
      "CLOUDFLARE_DEVICES_FAILED"
    )
  }

  const metadata = await claimMatchingDevicesForUser(userId, physicalDevices)

  const admin = createAdminClient()
  const { data: ownedRows } = await admin
    .from("tenant_device_metadata")
    .select("cloudflare_device_id, display_name")
    .eq("user_id", userId)

  for (const row of ownedRows ?? []) {
    if (!metadata.has(row.cloudflare_device_id)) {
      metadata.set(row.cloudflare_device_id, row.display_name)
    }
  }

  return physicalDevices
    .filter((device) => metadata.has(device.id))
    .map((device) => mapPhysicalDevice(device, metadata))
}

export async function getEnrolledDeviceCount(): Promise<number> {
  const devices = await listConnectedDevices()
  return devices.filter((device) => device.status === "active").length
}
