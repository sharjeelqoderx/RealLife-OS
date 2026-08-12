import type { Tables } from "@/types/supabase"

/** Supabase `user_subscriptions` row — from generated `types/supabase.ts`. */
export type UserSubscription = Tables<"user_subscriptions">

/** App-level status union matching DB check constraint. */
export type SubscriptionStatus =
  | "none"
  | "incomplete"
  | "incomplete_expired"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "paused"

export const ACTIVE_SUBSCRIPTION_STATUSES: SubscriptionStatus[] = [
  "active",
  "trialing",
]

export function isSubscriptionStatus(value: string): value is SubscriptionStatus {
  return (
    value === "none" ||
    value === "incomplete" ||
    value === "incomplete_expired" ||
    value === "trialing" ||
    value === "active" ||
    value === "past_due" ||
    value === "canceled" ||
    value === "unpaid" ||
    value === "paused"
  )
}

export function asSubscriptionStatus(value: string | undefined): SubscriptionStatus {
  if (value && isSubscriptionStatus(value)) return value
  return "none"
}

export function hasActiveAccess(
  status: SubscriptionStatus,
  currentPeriodEnd?: string | null
): boolean {
  if (!ACTIVE_SUBSCRIPTION_STATUSES.includes(status)) {
    return false
  }

  if (currentPeriodEnd) {
    const endsAt = new Date(currentPeriodEnd).getTime()
    if (!Number.isNaN(endsAt) && endsAt <= Date.now()) {
      return false
    }
  }

  return true
}
