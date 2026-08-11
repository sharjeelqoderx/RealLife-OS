import { createAdminClient } from "@/lib/supabase/admin"
import {
  DeviceServiceError,
  requireAuthenticatedUserId,
} from "@/lib/services/devices/context"
import type {
  DeviceAppPreferences,
  UpdateDeviceAppPreferencesInput,
} from "@/schemas/devices/api"

type PreferencesRow = {
  lock_filter_switch: boolean
  prevent_logout: boolean
  updated_at: string
}

const DEFAULT_PREFERENCES: DeviceAppPreferences = {
  lockFilterSwitch: true,
  preventLogout: true,
  updatedAt: new Date(0).toISOString(),
}

export async function getDeviceAppPreferences(): Promise<DeviceAppPreferences> {
  const userId = await requireAuthenticatedUserId()
  const admin = createAdminClient()

  const { data, error } = await admin
    .from("device_app_preferences")
    .select("lock_filter_switch, prevent_logout, updated_at")
    .eq("user_id", userId)
    .maybeSingle()

  if (error) {
    console.error("getDeviceAppPreferences:", error)
    throw new DeviceServiceError(
      "Failed to load device app preferences",
      500,
      "DB_ERROR"
    )
  }

  if (!data) {
    return DEFAULT_PREFERENCES
  }

  const row = data as PreferencesRow

  return {
    lockFilterSwitch: row.lock_filter_switch,
    preventLogout: row.prevent_logout,
    updatedAt: row.updated_at,
  }
}

export async function updateDeviceAppPreferences(
  input: UpdateDeviceAppPreferencesInput
): Promise<DeviceAppPreferences> {
  const userId = await requireAuthenticatedUserId()
  const admin = createAdminClient()
  const existing = await getDeviceAppPreferences()

  const next = {
    lock_filter_switch: input.lockFilterSwitch ?? existing.lockFilterSwitch,
    prevent_logout: input.preventLogout ?? existing.preventLogout,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await admin
    .from("device_app_preferences")
    .upsert(
      {
        user_id: userId,
        ...next,
      },
      { onConflict: "user_id" }
    )
    .select("lock_filter_switch, prevent_logout, updated_at")
    .single()

  if (error || !data) {
    console.error("updateDeviceAppPreferences:", error)
    throw new DeviceServiceError(
      "Failed to save device app preferences",
      500,
      "DB_ERROR"
    )
  }

  const row = data as PreferencesRow

  return {
    lockFilterSwitch: row.lock_filter_switch,
    preventLogout: row.prevent_logout,
    updatedAt: row.updated_at,
  }
}
