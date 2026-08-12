import {
  getStripePriceFamilyMonthly,
  getStripePriceFocusMonthly,
} from "@/lib/env"
import {
  getDeviceLimitFromPlanId,
  getPlanDisplayName,
  getSelfServePlanDeviceLimit,
} from "@/lib/stripe/plans"
import type { UserSubscription } from "@/types/billing"

export type DeviceLimitSource = "plan" | "account_override" | "none"

export type SubscriptionDeviceLimit = {
  deviceLimit: number
  planId: string | undefined
  planName: string
  limitSource: DeviceLimitSource
}

/** Catalog cap from Stripe price id or stored plan id. */
export function getDeviceLimitFromStripePriceId(
  storedPlanOrPriceId: string | undefined
): number | undefined {
  const fromPlanId = getDeviceLimitFromPlanId(storedPlanOrPriceId)
  if (fromPlanId !== undefined) {
    return fromPlanId
  }

  if (!storedPlanOrPriceId) {
    return getSelfServePlanDeviceLimit("free_trial")
  }

  try {
    if (storedPlanOrPriceId === getStripePriceFocusMonthly()) {
      return getSelfServePlanDeviceLimit("focus")
    }
    if (storedPlanOrPriceId === getStripePriceFamilyMonthly()) {
      return getSelfServePlanDeviceLimit("family")
    }
  } catch {
    return undefined
  }

  return undefined
}

function getPlanNameForPriceId(planId: string | undefined): string {
  let planName = getPlanDisplayName(planId)
  try {
    if (planId === getStripePriceFocusMonthly()) planName = "Focus"
    else if (planId === getStripePriceFamilyMonthly()) planName = "Family"
  } catch {
    // keep catalog display name
  }
  return planName
}

/**
 * Effective device cap from the required `user_subscriptions.device_limit` column.
 * Fail closed when no row exists.
 */
export function getSubscriptionDeviceLimit(
  row: Pick<UserSubscription, "device_limit" | "stripe_price_id"> | null
): SubscriptionDeviceLimit {
  const planId = row?.stripe_price_id ?? undefined
  const planName = getPlanNameForPriceId(planId)

  if (!row) {
    return {
      deviceLimit: 0,
      planId,
      planName,
      limitSource: "none",
    }
  }

  const deviceLimit = row.device_limit
  const catalogLimit = getDeviceLimitFromStripePriceId(planId)
  const limitSource =
    catalogLimit !== undefined && catalogLimit === deviceLimit
      ? "plan"
      : "account_override"

  return {
    deviceLimit,
    planId,
    planName,
    limitSource,
  }
}

/** Device cap to persist on subscription writes (required column). */
export function getDeviceLimitForSubscriptionWrite(input: {
  stripePriceId: string | null
  deviceLimit?: number
  existingDeviceLimit?: number
}): number {
  if (
    typeof input.deviceLimit === "number" &&
    Number.isInteger(input.deviceLimit) &&
    input.deviceLimit > 0
  ) {
    return input.deviceLimit
  }

  const fromCatalog = getDeviceLimitFromStripePriceId(
    input.stripePriceId ?? undefined
  )
  if (typeof fromCatalog === "number" && fromCatalog > 0) {
    return fromCatalog
  }

  if (
    typeof input.existingDeviceLimit === "number" &&
    input.existingDeviceLimit > 0
  ) {
    return input.existingDeviceLimit
  }

  return getSelfServePlanDeviceLimit("free_trial")
}
