import { createAdminClient } from "@/lib/supabase/admin"
import { revokePhysicalDevice } from "@/lib/services/cloudflare/devices"
import {
  DeviceServiceError,
  getDeviceAccountContext,
  requireAuthenticatedUserId,
} from "@/lib/services/devices/context"

export async function revokeConnectedDevice(
  deviceId: string
): Promise<void> {
  const userId = await requireAuthenticatedUserId()
  const { accountId } = await getDeviceAccountContext(userId)
  const admin = createAdminClient()
  const { data: owned, error: ownershipError } = await admin
    .from("tenant_device_metadata")
    .select("cloudflare_device_id")
    .eq("id", deviceId)
    .eq("user_id", userId)
    .maybeSingle()
  if (ownershipError || !owned) {
    throw new DeviceServiceError("Device not found", 404, "NOT_FOUND")
  }

  try {
    await revokePhysicalDevice(accountId, owned.cloudflare_device_id)
  } catch {
    throw new DeviceServiceError(
      "Unable to revoke device.",
      502,
      "CLOUDFLARE_REVOKE_FAILED"
    )
  }

  const { error } = await admin.from("audit_log").insert({
    user_id: userId,
    action: "DEVICE_REVOKED",
    resource_type: "device",
    resource_id: deviceId,
  })
  if (error) console.error("revokeConnectedDevice: audit log write failed")
}
