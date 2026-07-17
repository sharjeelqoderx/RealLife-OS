import { createAdminClient } from "@/lib/supabase/admin"
import {
  hasActiveAccess,
  type SubscriptionStatus,
  type UserSubscription,
} from "@/types/billing"

export async function getSubscriptionByUserId(userId: string) {
  const { data, error } = await createAdminClient()
    .from("user_subscriptions")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data as UserSubscription | null
}

export async function getSubscriptionByCustomerId(customerId: string) {
  const { data, error } = await createAdminClient()
    .from("user_subscriptions")
    .select("*")
    .eq("stripe_customer_id", customerId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data as UserSubscription | null
}

export async function getBillingStatus(userId: string) {
  const row = await getSubscriptionByUserId(userId)
  const status = (row?.status ?? "none") as SubscriptionStatus

  return {
    hasAccess: hasActiveAccess(status, row?.current_period_end),
    status,
    currentPeriodEnd: row?.current_period_end ?? null,
    cancelAtPeriodEnd: row?.cancel_at_period_end ?? false,
    planId: row?.stripe_price_id ?? null,
  }
}

export async function saveSubscription(row: {
  userId: string
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  stripePriceId: string | null
  status: SubscriptionStatus
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
}) {
  const { error } = await createAdminClient().from("user_subscriptions").upsert(
    {
      user_id: row.userId,
      stripe_customer_id: row.stripeCustomerId,
      stripe_subscription_id: row.stripeSubscriptionId,
      stripe_price_id: row.stripePriceId,
      status: row.status,
      current_period_end: row.currentPeriodEnd,
      cancel_at_period_end: row.cancelAtPeriodEnd,
    },
    { onConflict: "user_id" }
  )

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
    })
    return
  }

  if (existing.stripe_customer_id === stripeCustomerId) return

  const { error } = await createAdminClient()
    .from("user_subscriptions")
    .update({ stripe_customer_id: stripeCustomerId })
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
  const { error } = await createAdminClient()
    .from("stripe_webhook_events")
    .insert({ id: eventId, type })

  if (error && error.code !== "23505") throw new Error(error.message)
}
