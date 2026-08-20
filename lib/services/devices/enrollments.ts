import { getCloudflareTeamName } from "@/lib/cloudflare/config"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import {
  listPhysicalDevices,
  listRegistrations,
} from "@/lib/services/cloudflare/devices"
import { registerEnrollmentEmail } from "@/lib/services/cloudflare/enrollment-access"
import { requireDeviceSlotAvailable } from "@/lib/services/devices/device-quota"
import {
  DeviceServiceError,
  getDeviceAccountContext,
  requireAuthenticatedUserId,
} from "@/lib/services/devices/context"
import type { CreateDeviceEnrollmentInput } from "@/schemas/devices/api"
import type { DevicePlatform } from "@/schemas/devices/device"

const ENROLLMENT_TTL_MS = 15 * 60_000

type EnrollmentRow = {
  id: string
  user_id: string
  requested_device_name: string
  status: string
  expires_at: string
  cloudflare_device_id: string | null
  cloudflare_registration_id: string | null
  created_at: string
}

function platformFromDeviceName(deviceName: string): DevicePlatform {
  const normalized = deviceName.trim().toLowerCase()
  if (normalized.includes("android")) return "android"
  return "iphone"
}

function deviceNameForPlatform(platform: DevicePlatform): string {
  return platform === "android" ? "Android device" : "iPhone or iPad"
}

function platformInstructions(teamName: string): Record<string, string> {
  return {
    windows: `Install Cloudflare One Client, select Zero Trust, enter ${teamName}, and finish the organization sign-in.`,
    macos: `Install Cloudflare One Client, select Zero Trust, enter ${teamName}, and finish the organization sign-in.`,
    linux: `Install Cloudflare One Client, then run: warp-cli registration new ${teamName}. Complete the browser sign-in.`,
    ios: `Install Cloudflare One Agent, enter ${teamName}, complete sign-in, install the VPN profile, then connect.`,
    android: `Install Cloudflare One Agent, enter ${teamName}, complete sign-in, and connect.`,
  }
}

async function writeAuditLog(
  userId: string,
  action: string,
  resourceId: string
): Promise<void> {
  const { error } = await createAdminClient().from("audit_log").insert({
    user_id: userId,
    action,
    resource_type: "device_enrollment",
    resource_id: resourceId,
  })
  if (error) console.error("audit log write failed", { action, resourceId })
}

export async function createDeviceEnrollment(
  input: CreateDeviceEnrollmentInput
): Promise<{
  enrollmentId: string
  status: "pending"
  teamName: string
  enrollmentEmail: string
  platform: DevicePlatform
  resumed: boolean
  platformInstructions: Record<string, string>
}> {
  const userId = await requireAuthenticatedUserId()
  await requireDeviceSlotAvailable(userId)
  const { tenantReady } = await getDeviceAccountContext(userId)
  if (!tenantReady) {
    throw new DeviceServiceError(
      "Device enrollment is temporarily unavailable.",
      503,
      "CLOUDFLARE_UNAVAILABLE"
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const enrollmentEmail = user?.email?.trim().toLowerCase()
  if (!enrollmentEmail) {
    throw new DeviceServiceError(
      "Your account email is required for Cloudflare enrollment.",
      400,
      "ENROLLMENT_EMAIL_REQUIRED"
    )
  }

  try {
    await registerEnrollmentEmail(enrollmentEmail)
  } catch (error) {
    console.error("createDeviceEnrollment: registerEnrollmentEmail failed", error)
    throw new DeviceServiceError(
      error instanceof Error
        ? error.message
        : "Unable to register your email for Cloudflare device enrollment.",
      502,
      "ENROLLMENT_EMAIL_REGISTER_FAILED"
    )
  }

  const requestedPlatform =
    input.platform ?? platformFromDeviceName(input.deviceName)
  const deviceName = deviceNameForPlatform(requestedPlatform)
  const teamName = getCloudflareTeamName()
  const now = new Date()
  const expiresAt = new Date(now.getTime() + ENROLLMENT_TTL_MS).toISOString()
  const admin = createAdminClient()

  await admin
    .from("device_enrollments")
    .update({ status: "expired" })
    .eq("user_id", userId)
    .eq("status", "pending")
    .lt("expires_at", now.toISOString())

  const { data: existingPending } = await admin
    .from("device_enrollments")
    .select("id, requested_device_name, expires_at")
    .eq("user_id", userId)
    .eq("status", "pending")
    .gt("expires_at", now.toISOString())
    .maybeSingle()

  if (existingPending) {
    const platform = platformFromDeviceName(existingPending.requested_device_name)
    return {
      enrollmentId: existingPending.id,
      status: "pending",
      teamName,
      enrollmentEmail,
      platform,
      resumed: true,
      platformInstructions: platformInstructions(teamName),
    }
  }

  const { data, error } = await admin
    .from("device_enrollments")
    .insert({
      user_id: userId,
      requested_device_name: deviceName,
      expires_at: expiresAt,
    })
    .select("id")
    .single()

  if (error?.code === "23505") {
    const { data: racedPending } = await admin
      .from("device_enrollments")
      .select("id, requested_device_name")
      .eq("user_id", userId)
      .eq("status", "pending")
      .gt("expires_at", now.toISOString())
      .maybeSingle()

    if (racedPending) {
      return {
        enrollmentId: racedPending.id,
        status: "pending",
        teamName,
        enrollmentEmail,
        platform: platformFromDeviceName(racedPending.requested_device_name),
        resumed: true,
        platformInstructions: platformInstructions(teamName),
      }
    }

    throw new DeviceServiceError(
      "Finish or wait for your existing device enrollment before starting another.",
      409,
      "ENROLLMENT_ALREADY_PENDING"
    )
  }
  if (error || !data) {
    throw new DeviceServiceError(
      "Unable to start device enrollment.",
      500,
      "ENROLLMENT_CREATE_FAILED"
    )
  }
  await writeAuditLog(userId, "DEVICE_ENROLLMENT_STARTED", data.id)

  return {
    enrollmentId: data.id,
    status: "pending",
    teamName,
    enrollmentEmail,
    platform: requestedPlatform,
    resumed: false,
    platformInstructions: platformInstructions(teamName),
  }
}

export async function cancelDeviceEnrollment(enrollmentId: string): Promise<void> {
  const userId = await requireAuthenticatedUserId()
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("device_enrollments")
    .update({ status: "expired" })
    .eq("id", enrollmentId)
    .eq("user_id", userId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle()

  if (error) {
    throw new DeviceServiceError(
      "Unable to cancel enrollment.",
      500,
      "ENROLLMENT_CANCEL_FAILED"
    )
  }
  if (!data) {
    throw new DeviceServiceError("Enrollment not found", 404, "NOT_FOUND")
  }

  await writeAuditLog(userId, "DEVICE_ENROLLMENT_CANCELLED", enrollmentId)
}

export async function getDeviceEnrollmentStatus(enrollmentId: string): Promise<{
  status: "pending" | "completed" | "expired" | "failed" | "ambiguous"
}> {
  const userId = await requireAuthenticatedUserId()
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("device_enrollments")
    .select(
      "id, user_id, requested_device_name, status, expires_at, cloudflare_device_id, cloudflare_registration_id, created_at"
    )
    .eq("id", enrollmentId)
    .eq("user_id", userId)
    .maybeSingle()
  const enrollment = data as EnrollmentRow | null

  if (error || !enrollment) {
    throw new DeviceServiceError("Enrollment not found", 404, "NOT_FOUND")
  }
  if (enrollment.status === "active") return { status: "completed" }
  if (new Date(enrollment.expires_at).getTime() <= Date.now()) {
    await admin
      .from("device_enrollments")
      .update({ status: "expired" })
      .eq("id", enrollment.id)
    return { status: "expired" }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const userEmail = user?.email?.trim().toLowerCase()
  const { accountId, tenantReady } = await getDeviceAccountContext(userId)
  if (!userEmail || !tenantReady) return { status: "pending" }

  const [physicalDevices, registrations] = await Promise.all([
    listPhysicalDevices(accountId),
    listRegistrations(accountId),
  ])
  const enrollmentStartedAt = new Date(enrollment.created_at).getTime()
  const matchingRegistrations = registrations.filter((registration) => {
    const registeredEmail = registration.user?.email?.trim().toLowerCase()
    const registeredAt = new Date(registration.created_at).getTime()
    return (
      registeredEmail === userEmail &&
      Number.isFinite(registeredAt) &&
      registeredAt >= enrollmentStartedAt &&
      !registration.deleted_at &&
      !registration.revoked_at &&
      Boolean(registration.device?.id)
    )
  })

  if (matchingRegistrations.length === 0) return { status: "pending" }
  if (matchingRegistrations.length > 1) {
    return { status: "ambiguous" }
  }

  const registration = matchingRegistrations[0]
  const device = physicalDevices.find(
    (candidate) =>
      candidate.id === registration.device?.id &&
      (candidate.active_registrations ?? 0) > 0
  )
  if (!device) return { status: "pending" }

  const { data: owner, error: ownerLookupError } = await admin
    .from("tenant_device_metadata")
    .select("user_id")
    .eq("cloudflare_device_id", device.id)
    .maybeSingle()
  if (ownerLookupError) {
    throw new DeviceServiceError(
      "Unable to verify device ownership.",
      503,
      "DEVICE_OWNERSHIP_UNAVAILABLE"
    )
  }
  if (owner && owner.user_id !== userId) {
    return { status: "failed" }
  }

  if (!owner) {
    // Recheck quota at claim time so concurrent enrollments cannot exceed the plan.
    await requireDeviceSlotAvailable(userId)
    const { data: inserted, error: ownershipError } = await admin
      .from("tenant_device_metadata")
      .insert({
        user_id: userId,
        cloudflare_device_id: device.id,
        display_name: enrollment.requested_device_name,
      })
      .select("id")
      .single()
    if (ownershipError) {
      // Unique conflict means another account claimed the device first.
      return { status: "failed" }
    }

    try {
      const { accountId } = await getDeviceAccountContext(userId)
      const { ensureDeviceDnsLocation } = await import(
        "@/lib/services/devices/device-dns-location"
      )
      await ensureDeviceDnsLocation({
        accountId,
        userId,
        deviceId: inserted.id,
        displayName: enrollment.requested_device_name,
      })
    } catch (locationError) {
      console.error(
        "getDeviceEnrollmentStatus: DNS location provision failed",
        locationError
      )
    }
  } else {
    await admin
      .from("tenant_device_metadata")
      .update({
        display_name: enrollment.requested_device_name,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("cloudflare_device_id", device.id)
  }

  await admin
    .from("device_enrollments")
    .update({
      status: "active",
      cloudflare_device_id: device.id,
      cloudflare_registration_id: registration.id,
      completed_at: new Date().toISOString(),
    })
    .eq("id", enrollment.id)
  await writeAuditLog(userId, "DEVICE_ENROLLMENT_COMPLETED", enrollment.id)
  return { status: "completed" }
}
