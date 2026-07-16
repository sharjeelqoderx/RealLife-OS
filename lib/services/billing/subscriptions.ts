import { createAdminClient } from "@/lib/supabase/admin"
import {
  hasActiveAccess,
  type SubscriptionStatus,
  type UserSubscription,
} from "@/types/billing"

export async function getSubscriptionByUserId(
  userId: string
): Promise<UserSubscription | null> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from("user_subscriptions")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to load subscription: ${error.message}`)
  }

  return data as UserSubscription | null
}

export async function getSubscriptionByStripeCustomerId(
  stripeCustomerId: string
): Promise<UserSubscription | null> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from("user_subscriptions")
    .select("*")
    .eq("stripe_customer_id", stripeCustomerId)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to load subscription by customer: ${error.message}`)
  }

  return data as UserSubscription | null
}

export async function getBillingStatusForUser(userId: string) {
  const subscription = await getSubscriptionByUserId(userId)
  const status = (subscription?.status ?? "none") as SubscriptionStatus

  return {
    hasAccess: hasActiveAccess(status),
    status,
    currentPeriodEnd: subscription?.current_period_end ?? null,
    cancelAtPeriodEnd: subscription?.cancel_at_period_end ?? false,
    planId: subscription?.stripe_price_id ?? null,
  }
}

export interface UpsertSubscriptionInput {
  userId: string
  stripeCustomerId?: string | null
  stripeSubscriptionId?: string | null
  stripePriceId?: string | null
  status: SubscriptionStatus
  currentPeriodEnd?: string | null
  cancelAtPeriodEnd?: boolean
}

export async function upsertUserSubscription(
  input: UpsertSubscriptionInput
): Promise<void> {
  const supabase = createAdminClient()

  const payload: Record<string, unknown> = {
    user_id: input.userId,
    status: input.status,
  }

  if (input.stripeCustomerId !== undefined) {
    payload.stripe_customer_id = input.stripeCustomerId
  }
  if (input.stripeSubscriptionId !== undefined) {
    payload.stripe_subscription_id = input.stripeSubscriptionId
  }
  if (input.stripePriceId !== undefined) {
    payload.stripe_price_id = input.stripePriceId
  }
  if (input.currentPeriodEnd !== undefined) {
    payload.current_period_end = input.currentPeriodEnd
  }
  if (input.cancelAtPeriodEnd !== undefined) {
    payload.cancel_at_period_end = input.cancelAtPeriodEnd
  }

  const { error } = await supabase.from("user_subscriptions").upsert(payload, {
    onConflict: "user_id",
  })

  if (error) {
    throw new Error(`Failed to upsert subscription: ${error.message}`)
  }
}

export async function markWebhookEventProcessed(
  eventId: string,
  eventType: string
): Promise<boolean> {
  const supabase = createAdminClient()

  const { error } = await supabase.from("stripe_webhook_events").insert({
    id: eventId,
    type: eventType,
  })

  if (error) {
    if (error.code === "23505") {
      return false
    }
    throw new Error(`Failed to record webhook event: ${error.message}`)
  }

  return true
}
