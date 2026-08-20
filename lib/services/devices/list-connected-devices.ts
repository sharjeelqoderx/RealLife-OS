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
import { getDeviceProfileMap } from "@/lib/services/devices/device-profiles"
import { resolveEffectivePolicy } from "@/lib/services/policy-assignments/resolve-effective-policy"
import type { ConnectedDevice } from "@/schemas/devices/device"

type DeviceMetadata = {
  id: string
  displayName: string | null
  dohSubdomain: string | null
}

function isMissingSchemaError(error: {
  code?: string
  message?: string
}): boolean {
  return (
    error.code === "PGRST205" ||
    error.code === "42703" ||
    error.code === "42P01" ||
    (error.message?.includes("schema cache") ?? false) ||
    (error.message?.includes("does not exist") ?? false)
  )
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

  // Prefer columns from the profiles/assignment migration; fall back if not applied.
  let ownedRows: Array<{
    id: string
    cloudflare_device_id: string
    display_name: string | null
    doh_subdomain?: string | null
  }> | null = null

  const withLocationCols = await admin
    .from("tenant_device_metadata")
    .select("id, cloudflare_device_id, display_name, doh_subdomain")
    .eq("user_id", userId)

  if (withLocationCols.error && isMissingSchemaError(withLocationCols.error)) {
    const legacy = await admin
      .from("tenant_device_metadata")
      .select("id, cloudflare_device_id, display_name")
      .eq("user_id", userId)

    if (legacy.error) {
      console.error(
        "listConnectedDevices: ownership lookup failed:",
        legacy.error.message
      )
      throw new DeviceServiceError(
        "Unable to verify device ownership. Try again shortly.",
        503,
        "DEVICE_OWNERSHIP_UNAVAILABLE"
      )
    }
    ownedRows = legacy.data
  } else if (withLocationCols.error) {
    console.error(
      "listConnectedDevices: ownership lookup failed:",
      withLocationCols.error.message
    )
    throw new DeviceServiceError(
      "Unable to verify device ownership. Try again shortly.",
      503,
      "DEVICE_OWNERSHIP_UNAVAILABLE"
    )
  } else {
    ownedRows = withLocationCols.data
  }

  const metadata = new Map(
    (ownedRows ?? []).map((row) => [
      row.cloudflare_device_id,
      {
        id: row.id,
        displayName: row.display_name,
        dohSubdomain: row.doh_subdomain ?? null,
      },
    ])
  )

  let profileByDevice = new Map<string, { id: string; name: string }>()
  try {
    profileByDevice = await getDeviceProfileMap(userId)
  } catch (error) {
    console.warn("listConnectedDevices: profiles unavailable:", error)
  }

  const mapped = physicalDevices
    .filter((device) => metadata.has(device.id))
    .map(async (device) => {
      const meta = metadata.get(device.id)!
      const platform = mapCloudflareDeviceType(device.device_type)
      const lastSeenIso = device.last_seen_at ?? device.last_seen
      const hasActiveRegistration = (device.active_registrations ?? 0) > 0
      const profile = profileByDevice.get(meta.id) ?? null

      let effective: {
        effectivePolicyId: string | null
        effectivePolicyName: string | null
        effectivePolicySource: "device" | "profile" | "none"
      } = {
        effectivePolicyId: null,
        effectivePolicyName: null,
        effectivePolicySource: "none",
      }

      try {
        const resolved = await resolveEffectivePolicy(userId, meta.id)
        effective = {
          effectivePolicyId: resolved.effectivePolicy?.id ?? null,
          effectivePolicyName: resolved.effectivePolicy?.name ?? null,
          effectivePolicySource: resolved.source,
        }
      } catch (error) {
        if (
          !(
            error &&
            typeof error === "object" &&
            isMissingSchemaError(error as { code?: string; message?: string })
          )
        ) {
          console.error("listConnectedDevices: effective policy failed", error)
        }
      }

      return {
        id: meta.id,
        registrationId: null,
        name: getDeviceDisplayName(device, metadata),
        platform: platform === "unknown" ? "iphone" : platform,
        status: hasActiveRegistration ? "active" : "inactive",
        lastSeenMinutes: minutesSince(lastSeenIso),
        deviceType: device.device_type ?? null,
        model: device.model ?? null,
        osVersion: device.os_version ?? null,
        userEmail: device.last_seen_user?.email ?? null,
        profileId: profile?.id ?? null,
        profileName: profile?.name ?? null,
        dohSubdomain: meta.dohSubdomain,
        ...effective,
      } satisfies ConnectedDevice
    })

  return Promise.all(mapped)
}

export async function getEnrolledDeviceCount(): Promise<number> {
  const devices = await listConnectedDevices()
  return devices.filter((device) => device.status === "active").length
}
