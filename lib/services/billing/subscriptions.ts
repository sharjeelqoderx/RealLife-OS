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
    hasAccess: hasActiveAccess(status),
    status,
    currentPeriodEnd: row?.current_period_end ?? null,
    cancelAtPeriodEnd: row?.cancel_at_period_end ?? false,
    planId: row?.stripe_price_id ?? null,
  }
}

export async function upsertSubscription(row: {
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

export async function claimWebhookEvent(eventId: string, type: string) {
  const { error } = await createAdminClient()
    .from("stripe_webhook_events")
    .insert({ id: eventId, type })

  if (error?.code === "23505") return false
  if (error) throw new Error(error.message)
  return true
}

export async function releaseWebhookEvent(eventId: string) {
  await createAdminClient()
    .from("stripe_webhook_events")
    .delete()
    .eq("id", eventId)
}
