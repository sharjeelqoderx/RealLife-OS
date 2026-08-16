import { createAdminClient } from "@/lib/supabase/admin"
import {
  listPhysicalDevices,
  type CloudflarePhysicalDevice,
} from "@/lib/services/cloudflare/devices"
import {
  DeviceServiceError,
  getDeviceAccountContext,
  mapCloudflareDeviceType,
  minutesSince,
  requireAuthenticatedUserId,
} from "@/lib/services/devices/context"
import type { ConnectedDevice } from "@/schemas/devices/device"

type DeviceMetadata = {
  id: string
  displayName: string | null
}

function getDeviceDisplayName(
  device: CloudflarePhysicalDevice,
  metadata: Map<string, DeviceMetadata>
): string {
  const override = metadata.get(device.id)?.displayName
  if (override?.trim()) {
    return override.trim()
  }

  if (device.name?.trim()) {
    return device.name.trim()
  }

  const userName = device.last_seen_user?.name?.trim()
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
  metadata: Map<string, DeviceMetadata>
): ConnectedDevice {
  const platform = mapCloudflareDeviceType(device.device_type)
  const lastSeenIso = device.last_seen_at ?? device.last_seen
  const hasActiveRegistration = (device.active_registrations ?? 0) > 0

  return {
    id: metadata.get(device.id)!.id,
    registrationId: null,
    name: getDeviceDisplayName(device, metadata),
    platform: platform === "unknown" ? "iphone" : platform,
    status: hasActiveRegistration ? "active" : "inactive",
    lastSeenMinutes: minutesSince(lastSeenIso),
    deviceType: device.device_type ?? null,
    model: device.model ?? null,
    osVersion: device.os_version ?? null,
    userEmail:
      device.last_seen_user?.email ?? null,
  }
}

/**
 * Devices for the signed-in user only. Ownership is established by a completed
 * pending enrollment, never by a browser-supplied Cloudflare ID or by merely
 * observing a matching email in the shared Zero Trust inventory.
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

  const admin = createAdminClient()
  const { data: ownedRows, error: ownershipError } = await admin
    .from("tenant_device_metadata")
    .select("id, cloudflare_device_id, display_name")
    .eq("user_id", userId)

  if (ownershipError) {
    console.error(
      "listConnectedDevices: ownership lookup failed:",
      ownershipError.message
    )
    throw new DeviceServiceError(
      "Unable to verify device ownership. Try again shortly.",
      503,
      "DEVICE_OWNERSHIP_UNAVAILABLE"
    )
  }

  const metadata = new Map(
    (ownedRows ?? []).map((row) => [
      row.cloudflare_device_id,
      { id: row.id, displayName: row.display_name },
    ])
  )

  return physicalDevices
    .filter((device) => metadata.has(device.id))
    .map((device) => mapPhysicalDevice(device, metadata))
}

export async function getEnrolledDeviceCount(): Promise<number> {
  const devices = await listConnectedDevices()
  return devices.filter((device) => device.status === "active").length
}
