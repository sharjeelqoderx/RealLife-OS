import type Stripe from "stripe"

import {
  getSubscriptionByCustomerId,
  getSubscriptionByUserId,
  saveCustomerId,
  saveSubscription,
} from "@/lib/services/billing/subscriptions"
import { getStripe } from "@/lib/stripe/client"
import { FREE_TRIAL_DAYS, FREE_TRIAL_PRICE_ID, getSelfServePlanDeviceLimit } from "@/lib/stripe/plans"
import {
  asSubscriptionStatus,
  hasActiveAccess,
  isLocalFreeTrialRow,
} from "@/types/billing"

export function asCustomerId(
  value: string | Stripe.Customer | Stripe.DeletedCustomer | null
): string | null {
  if (!value) return null
  return typeof value === "string" ? value : value.id
}

export function asSubscriptionId(
  value: string | Stripe.Subscription | null | undefined
): string | null {
  if (!value) return null
  return typeof value === "string" ? value : value.id
}

export function periodEnd(subscription: Stripe.Subscription): string | null {
  const item = subscription.items.data[0] as
    | (Stripe.SubscriptionItem & { current_period_end?: number })
    | undefined
  const unix = item?.current_period_end
  return typeof unix === "number" ? new Date(unix * 1000).toISOString() : null
}

export function priceId(subscription: Stripe.Subscription): string | null {
  return subscription.items.data[0]?.price?.id ?? null
}

export async function userIdFor(
  metadataUserId: string | null | undefined,
  stripeCustomerId: string | null
) {
  if (metadataUserId) return metadataUserId
  if (!stripeCustomerId) return null
  const row = await getSubscriptionByCustomerId(stripeCustomerId)
  return row?.user_id ?? null
}

/** Write full subscription row from a Stripe Subscription. */
export async function writeSubscription(
  userId: string,
  subscription: Stripe.Subscription
) {
  const existing = await getSubscriptionByUserId(userId)

  // Protect active local free trial from canceled/incomplete Stripe subscription noise.
  if (isLocalFreeTrialRow(existing)) {
    const isLivePaid =
      subscription.status === "active" ||
      subscription.status === "trialing" ||
      subscription.status === "past_due"
    if (!isLivePaid) {
      return
    }
  }

  const metaLimit = Number(subscription.metadata?.device_limit)
  await saveSubscription({
    userId,
    stripeCustomerId: asCustomerId(subscription.customer),
    stripeSubscriptionId: subscription.id,
    stripePriceId: priceId(subscription),
    status: asSubscriptionStatus(subscription.status),
    currentPeriodEnd: periodEnd(subscription),
    cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
    deviceLimit:
      Number.isInteger(metaLimit) && metaLimit > 0 ? metaLimit : undefined,
  })
}

export async function writeSubscriptionById(
  subscriptionId: string,
  fallbackUserId?: string | null
) {
  const subscription = await getStripe().subscriptions.retrieve(subscriptionId)
  const userId = await userIdFor(
    subscription.metadata?.user_id ?? fallbackUserId,
    asCustomerId(subscription.customer)
  )
  if (!userId) return
  await writeSubscription(userId, subscription)
}

export function invoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const legacy = (
    invoice as Stripe.Invoice & {
      subscription?: string | Stripe.Subscription | null
    }
  ).subscription
  const fromLegacy = asSubscriptionId(legacy)
  if (fromLegacy) return fromLegacy

  const parent = (
    invoice as Stripe.Invoice & {
      parent?: {
        subscription_details?: {
          subscription?: string | Stripe.Subscription | null
        } | null
      } | null
    }
  ).parent

  return asSubscriptionId(parent?.subscription_details?.subscription)
}

export async function setDefaultPaymentMethodFromSetup(
  customerId: string,
  setupIntentRef: string | Stripe.SetupIntent | null
) {
  const setupIntentId =
    typeof setupIntentRef === "string" ? setupIntentRef : setupIntentRef?.id

  if (!setupIntentId) return

  const setupIntent = await getStripe().setupIntents.retrieve(setupIntentId)
  const paymentMethodId =
    typeof setupIntent.payment_method === "string"
      ? setupIntent.payment_method
      : setupIntent.payment_method?.id

  if (!paymentMethodId) return

  await getStripe().customers.update(customerId, {
    invoice_settings: { default_payment_method: paymentMethodId },
  })
}

export async function startFreeTrial(
  userId: string,
  customerId: string | null
) {
  const existing = await getSubscriptionByUserId(userId)

  if (
    existing &&
    hasActiveAccess(
      asSubscriptionStatus(existing.status),
      existing.current_period_end
    )
  ) {
    return
  }

  const endsAt = new Date()
  endsAt.setDate(endsAt.getDate() + FREE_TRIAL_DAYS)

  await saveSubscription({
    userId,
    stripeCustomerId: customerId ?? existing?.stripe_customer_id ?? null,
    stripeSubscriptionId: null,
    stripePriceId: FREE_TRIAL_PRICE_ID,
    status: "trialing",
    currentPeriodEnd: endsAt.toISOString(),
    cancelAtPeriodEnd: true,
    deviceLimit: getSelfServePlanDeviceLimit("free_trial"),
  })
}

export { saveCustomerId, getSubscriptionByUserId, getSubscriptionByCustomerId }
