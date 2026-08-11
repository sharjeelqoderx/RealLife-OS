import { createAdminClient } from "@/lib/supabase/admin"
import {
  DeviceServiceError,
  requireAuthenticatedUserId,
} from "@/lib/services/devices/context"
import type { RenameDeviceInput } from "@/schemas/devices/api"

export async function renameConnectedDevice(
  cloudflareDeviceId: string,
  input: RenameDeviceInput
): Promise<void> {
  const userId = await requireAuthenticatedUserId()
  const admin = createAdminClient()

  const { error } = await admin.from("tenant_device_metadata").upsert(
    {
      user_id: userId,
      cloudflare_device_id: cloudflareDeviceId,
      display_name: input.displayName,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,cloudflare_device_id" }
  )

  if (error) {
    console.error("renameConnectedDevice:", error)
    throw new DeviceServiceError(
      "Failed to rename device",
      500,
      "DB_ERROR"
    )
  }
}
