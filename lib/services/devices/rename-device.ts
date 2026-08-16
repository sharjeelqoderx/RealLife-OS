import { createAdminClient } from "@/lib/supabase/admin"
import {
  DeviceServiceError,
  requireAuthenticatedUserId,
} from "@/lib/services/devices/context"
import type { RenameDeviceInput } from "@/schemas/devices/api"

export async function renameConnectedDevice(
  deviceId: string,
  input: RenameDeviceInput
): Promise<void> {
  const userId = await requireAuthenticatedUserId()
  const admin = createAdminClient()

  const { data: owned, error: lookupError } = await admin
    .from("tenant_device_metadata")
    .select("id")
    .eq("user_id", userId)
    .eq("id", deviceId)
    .maybeSingle()

  if (lookupError) {
    console.error("renameConnectedDevice: lookup:", lookupError)
    throw new DeviceServiceError(
      "Failed to rename device",
      500,
      "DB_ERROR"
    )
  }

  if (!owned) {
    throw new DeviceServiceError("Device not found", 404, "NOT_FOUND")
  }

  const { error } = await admin
    .from("tenant_device_metadata")
    .update({
      display_name: input.displayName,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("id", deviceId)

  if (error) {
    console.error("renameConnectedDevice:", error)
    throw new DeviceServiceError(
      "Failed to rename device",
      500,
      "DB_ERROR"
    )
  }
}
