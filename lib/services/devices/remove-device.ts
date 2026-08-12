import { createAdminClient } from "@/lib/supabase/admin"
import { revokePhysicalDevice } from "@/lib/services/cloudflare/devices"
import { listConnectedDevices } from "@/lib/services/devices/list-connected-devices"
import {
  DeviceServiceError,
  getDeviceAccountContext,
  requireAuthenticatedUserId,
} from "@/lib/services/devices/context"

export async function removeConnectedDevice(
  cloudflareDeviceId: string
): Promise<void> {
  const userId = await requireAuthenticatedUserId()
  const { accountId } = await getDeviceAccountContext(userId)

  const devices = await listConnectedDevices()
  const target = devices.find((device) => device.id === cloudflareDeviceId)

  if (!target) {
    throw new DeviceServiceError("Device not found", 404, "NOT_FOUND")
  }

  try {
    await revokePhysicalDevice(accountId, cloudflareDeviceId)
  } catch (error) {
    console.error("removeConnectedDevice: revoke failed:", error)
    throw new DeviceServiceError(
      error instanceof Error
        ? error.message
        : "Failed to revoke device in Cloudflare",
      502,
      "CLOUDFLARE_REVOKE_FAILED"
    )
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from("tenant_device_metadata")
    .delete()
    .eq("user_id", userId)
    .eq("cloudflare_device_id", cloudflareDeviceId)

  if (error) {
    console.warn("removeConnectedDevice: metadata delete failed:", error.message)
  }
}
