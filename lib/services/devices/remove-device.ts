import { createAdminClient } from "@/lib/supabase/admin"
import { deletePhysicalDevice } from "@/lib/services/cloudflare/devices"
import {
  DeviceServiceError,
  getDeviceAccountContext,
  requireAuthenticatedUserId,
} from "@/lib/services/devices/context"

export async function removeConnectedDevice(
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
    await deletePhysicalDevice(accountId, owned.cloudflare_device_id)
  } catch (error) {
    console.error("removeConnectedDevice: delete failed:", error)
    throw new DeviceServiceError(
      "Unable to remove device.",
      502,
      "CLOUDFLARE_DELETE_FAILED"
    )
  }

  const { error } = await admin
    .from("tenant_device_metadata")
    .delete()
    .eq("user_id", userId)
    .eq("id", deviceId)

  if (error) {
    console.warn("removeConnectedDevice: metadata delete failed:", error.message)
  }

  const { error: auditError } = await admin.from("audit_log").insert({
    user_id: userId,
    action: "DEVICE_DELETED",
    resource_type: "device",
    resource_id: deviceId,
  })
  if (auditError) {
    console.error("removeConnectedDevice: audit log write failed")
  }
}
