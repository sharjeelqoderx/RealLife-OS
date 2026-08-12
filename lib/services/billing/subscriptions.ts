import { createAdminClient } from "@/lib/supabase/admin"
import {
  getDeviceLimitForSubscriptionWrite,
  getSubscriptionDeviceLimit,
} from "@/lib/services/billing/plan-limits"
import {
  asSubscriptionStatus,
  hasActiveAccess,
  type SubscriptionStatus,
  type UserSubscription,
} from "@/types/billing"
import type { TablesInsert, TablesUpdate } from "@/types/supabase"

export async function getSubscriptionByUserId(
  userId: string
): Promise<UserSubscription | null> {
  const { data, error } = await createAdminClient()
    .from("user_subscriptions")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data
}

export async function getSubscriptionByCustomerId(
  customerId: string
): Promise<UserSubscription | null> {
  const { data, error } = await createAdminClient()
    .from("user_subscriptions")
    .select("*")
    .eq("stripe_customer_id", customerId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data
}

export async function getBillingStatus(userId: string) {
  const row = await getSubscriptionByUserId(userId)
  const status = asSubscriptionStatus(row?.status)
  const limitInfo = getSubscriptionDeviceLimit(row)

  return {
    hasAccess: hasActiveAccess(status, row?.current_period_end),
    status,
    currentPeriodEnd: row?.current_period_end ?? null,
    cancelAtPeriodEnd: row?.cancel_at_period_end ?? false,
    planId: row?.stripe_price_id ?? undefined,
    deviceLimit: limitInfo.deviceLimit,
    planName: limitInfo.planName,
  }
}

export async function saveSubscription(input: {
  userId: string
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  stripePriceId: string | null
  status: SubscriptionStatus
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  /** Required positive device cap. Defaults from plan catalog / existing row. */
  deviceLimit?: number
}) {
  const existing = await getSubscriptionByUserId(input.userId)
  const deviceLimit = getDeviceLimitForSubscriptionWrite({
    stripePriceId: input.stripePriceId,
    deviceLimit: input.deviceLimit,
    existingDeviceLimit: existing?.device_limit,
  })

  const payload: TablesInsert<"user_subscriptions"> = {
    user_id: input.userId,
    stripe_customer_id: input.stripeCustomerId,
    stripe_subscription_id: input.stripeSubscriptionId,
    stripe_price_id: input.stripePriceId,
    status: input.status,
    current_period_end: input.currentPeriodEnd,
    cancel_at_period_end: input.cancelAtPeriodEnd,
    device_limit: deviceLimit,
  }

  const { error } = await createAdminClient()
    .from("user_subscriptions")
    .upsert(payload, { onConflict: "user_id" })

  if (error) throw new Error(error.message)
}

/** Set a required per-account device cap (Enterprise deals). */
export async function setAccountDeviceLimit(
  userId: string,
  deviceLimit: number
): Promise<void> {
  if (!Number.isInteger(deviceLimit) || deviceLimit < 1) {
    throw new Error("device_limit must be a positive integer")
  }

  const existing = await getSubscriptionByUserId(userId)
  if (!existing) {
    const insertRow: TablesInsert<"user_subscriptions"> = {
      user_id: userId,
      device_limit: deviceLimit,
      status: "none",
    }
    const { error } = await createAdminClient()
      .from("user_subscriptions")
      .insert(insertRow)
    if (error) throw new Error(error.message)
    return
  }

  const updateRow: TablesUpdate<"user_subscriptions"> = {
    device_limit: deviceLimit,
  }
  const { error } = await createAdminClient()
    .from("user_subscriptions")
    .update(updateRow)
    .eq("user_id", userId)

  if (error) throw new Error(error.message)
}

export async function saveCustomerId(userId: string, stripeCustomerId: string) {
  const existing = await getSubscriptionByUserId(userId)

  if (!existing) {
    await saveSubscription({
      userId,
      stripeCustomerId,
      stripeSubscriptionId: null,
      stripePriceId: null,
      status: "none",
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      deviceLimit: 1,
    })
    return
  }

  if (existing.stripe_customer_id === stripeCustomerId) return

  const updateRow: TablesUpdate<"user_subscriptions"> = {
    stripe_customer_id: stripeCustomerId,
  }
  const { error } = await createAdminClient()
    .from("user_subscriptions")
    .update(updateRow)
    .eq("user_id", userId)

  if (error) throw new Error(error.message)
}

export async function webhookEventExists(eventId: string) {
  const { data, error } = await createAdminClient()
    .from("stripe_webhook_events")
    .select("id")
    .eq("id", eventId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return Boolean(data)
}

export async function saveWebhookEvent(eventId: string, type: string) {
  const insertRow: TablesInsert<"stripe_webhook_events"> = {
    id: eventId,
    type,
  }
  const { error } = await createAdminClient()
    .from("stripe_webhook_events")
    .insert(insertRow)

  if (error && error.code !== "23505") throw new Error(error.message)
}
