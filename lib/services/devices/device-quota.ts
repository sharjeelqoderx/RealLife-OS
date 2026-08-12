import {
  getSubscriptionDeviceLimit,
  type DeviceLimitSource,
} from "@/lib/services/billing/plan-limits"
import { getSubscriptionByUserId } from "@/lib/services/billing/subscriptions"
import {
  DeviceServiceError,
  requireAuthenticatedUserId,
} from "@/lib/services/devices/context"
import { getEnrolledDeviceCount } from "@/lib/services/devices/list-connected-devices"
import { asSubscriptionStatus, hasActiveAccess } from "@/types/billing"

export type { DeviceLimitSource }

export type DeviceQuota = {
  deviceLimit: number
  enrolledDeviceCount: number
  remainingDeviceSlots: number
  canAddDevice: boolean
  hasAccess: boolean
  planId: string | undefined
  planName: string
  limitSource: DeviceLimitSource
}

export async function getDeviceQuotaForUser(
  userId?: string
): Promise<DeviceQuota> {
  const accountUserId = userId ?? (await requireAuthenticatedUserId())
  const row = await getSubscriptionByUserId(accountUserId)
  const limitInfo = getSubscriptionDeviceLimit(row)
  const status = asSubscriptionStatus(row?.status)
  const hasAccess = hasActiveAccess(status, row?.current_period_end)

  let enrolledDeviceCount: number
  try {
    enrolledDeviceCount = await getEnrolledDeviceCount()
  } catch (error) {
    // Fail closed: unknown count must not allow enrollment.
    console.error("getDeviceQuotaForUser: enrolled count failed:", error)
    throw new DeviceServiceError(
      "Unable to verify device quota. Try again shortly.",
      503,
      "DEVICE_QUOTA_UNAVAILABLE"
    )
  }

  const { deviceLimit } = limitInfo
  const remainingDeviceSlots = Math.max(0, deviceLimit - enrolledDeviceCount)
  const canAddDevice =
    hasAccess && deviceLimit > 0 && enrolledDeviceCount < deviceLimit

  return {
    deviceLimit,
    enrolledDeviceCount,
    remainingDeviceSlots,
    canAddDevice,
    hasAccess,
    planId: limitInfo.planId,
    planName: limitInfo.planName,
    limitSource: limitInfo.limitSource,
  }
}

/**
 * Server-side gate for enrollment / setup writes.
 * UI checks are not enough — always call this before mutating setup state.
 */
export async function requireDeviceSlotAvailable(
  userId?: string
): Promise<DeviceQuota> {
  const quota = await getDeviceQuotaForUser(userId)

  if (!quota.hasAccess) {
    throw new DeviceServiceError(
      "An active subscription or trial is required to add devices.",
      403,
      "NO_ACCESS"
    )
  }

  if (quota.limitSource === "none" || quota.deviceLimit < 1) {
    throw new DeviceServiceError(
      "Your account has no device allowance. Contact sales to set an Enterprise device cap, or choose a plan.",
      403,
      "DEVICE_LIMIT_UNSET"
    )
  }

  if (!quota.canAddDevice) {
    throw new DeviceServiceError(
      `Device limit reached (${quota.enrolledDeviceCount}/${quota.deviceLimit}). Upgrade your plan or remove a device.`,
      403,
      "DEVICE_LIMIT_REACHED"
    )
  }

  return quota
}
