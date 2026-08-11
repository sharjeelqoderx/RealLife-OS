import { createAdminClient } from "@/lib/supabase/admin"
import {
  DeviceServiceError,
  requireAuthenticatedUserId,
} from "@/lib/services/devices/context"
import type { DeviceSetupSession } from "@/schemas/devices/api"
import type { DevicePlatform, DeviceSetupAnswers } from "@/schemas/devices/device"

type SetupSessionRow = {
  platform: DevicePlatform
  answers: DeviceSetupAnswers
  cloudflare_wizard_step: number
  updated_at: string
}

const DEFAULT_ANSWERS: DeviceSetupAnswers = {
  isManaged: "no",
  isConnectedToPolicy: undefined,
  certificateInstalled: undefined,
}

export async function getDeviceSetupSession(
  platform: DevicePlatform
): Promise<DeviceSetupSession> {
  const userId = await requireAuthenticatedUserId()
  const admin = createAdminClient()

  const { data, error } = await admin
    .from("device_setup_sessions")
    .select("platform, answers, cloudflare_wizard_step, updated_at")
    .eq("user_id", userId)
    .maybeSingle()

  if (error) {
    console.error("getDeviceSetupSession:", error)
    throw new DeviceServiceError(
      "Failed to load device setup session",
      500,
      "DB_ERROR"
    )
  }

  if (!data) {
    return {
      platform,
      answers: DEFAULT_ANSWERS,
      cloudflareWizardStep: 1,
      updatedAt: new Date(0).toISOString(),
    }
  }

  const row = data as SetupSessionRow

  return {
    platform: row.platform ?? platform,
    answers: { ...DEFAULT_ANSWERS, ...(row.answers ?? {}) },
    cloudflareWizardStep: row.cloudflare_wizard_step ?? 1,
    updatedAt: row.updated_at,
  }
}

export async function updateDeviceSetupSession(input: {
  platform?: DevicePlatform
  answers?: Partial<DeviceSetupAnswers>
  cloudflareWizardStep?: number
}): Promise<DeviceSetupSession> {
  const userId = await requireAuthenticatedUserId()
  const admin = createAdminClient()

  const existing = await getDeviceSetupSession(input.platform ?? "android")

  const nextPlatform = input.platform ?? existing.platform
  const nextAnswers = {
    ...existing.answers,
    ...(input.answers ?? {}),
  }
  const nextWizardStep = input.cloudflareWizardStep ?? existing.cloudflareWizardStep

  const { data, error } = await admin
    .from("device_setup_sessions")
    .upsert(
      {
        user_id: userId,
        platform: nextPlatform,
        answers: nextAnswers,
        cloudflare_wizard_step: nextWizardStep,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )
    .select("platform, answers, cloudflare_wizard_step, updated_at")
    .single()

  if (error || !data) {
    console.error("updateDeviceSetupSession:", error)
    throw new DeviceServiceError(
      "Failed to save device setup session",
      500,
      "DB_ERROR"
    )
  }

  const row = data as SetupSessionRow

  return {
    platform: row.platform,
    answers: { ...DEFAULT_ANSWERS, ...(row.answers ?? {}) },
    cloudflareWizardStep: row.cloudflare_wizard_step,
    updatedAt: row.updated_at,
  }
}
