import type Stripe from "stripe"

import {
  getSubscriptionByStripeCustomerId,
  getSubscriptionByUserId,
  markWebhookEventProcessed,
  upsertUserSubscription,
} from "@/lib/services/billing/subscriptions"
import { getStripe } from "@/lib/stripe/client"
import { getStripeWebhookSecret } from "@/lib/env"
import type { SubscriptionStatus } from "@/types/billing"

function customerIdFrom(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null
): string | null {
  if (!customer) return null
  return typeof customer === "string" ? customer : customer.id
}

function mapStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case "incomplete":
    case "incomplete_expired":
    case "trialing":
    case "active":
    case "past_due":
    case "canceled":
    case "unpaid":
    case "paused":
      return status
    default:
      return "none"
  }
}

function periodEnd(subscription: Stripe.Subscription): string | null {
  const value = (
    subscription as Stripe.Subscription & { current_period_end?: number }
  ).current_period_end

  return typeof value === "number"
    ? new Date(value * 1000).toISOString()
    : null
}

function priceId(subscription: Stripe.Subscription): string | null {
  return subscription.items.data[0]?.price?.id ?? null
}

async function resolveUserId(
  metadataUserId: string | null | undefined,
  stripeCustomerId: string | null
): Promise<string | null> {
  if (metadataUserId) return metadataUserId
  if (!stripeCustomerId) return null

  const row = await getSubscriptionByStripeCustomerId(stripeCustomerId)
  return row?.user_id ?? null
}

/** Writes the full subscription row from a Stripe Subscription object. */
async function saveSubscription(
  subscription: Stripe.Subscription,
  fallbackUserId?: string | null
) {
  const stripeCustomerId = customerIdFrom(subscription.customer)
  const userId = await resolveUserId(
    subscription.metadata?.user_id ?? fallbackUserId,
    stripeCustomerId
  )

  if (!userId) {
    console.warn("[stripe webhook] no user for subscription", subscription.id)
    return
  }

  await upsertUserSubscription({
    userId,
    stripeCustomerId,
    stripeSubscriptionId: subscription.id,
    stripePriceId: priceId(subscription),
    status: mapStatus(subscription.status),
    currentPeriodEnd: periodEnd(subscription),
    cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
  })
}

async function onCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId =
    session.metadata?.user_id ?? session.client_reference_id ?? null

  if (!userId) {
    console.warn("[stripe webhook] checkout missing user_id", session.id)
    return
  }

  if (session.mode !== "subscription" || !session.subscription) {
    await upsertUserSubscription({
      userId,
      stripeCustomerId: customerIdFrom(session.customer),
      status: session.payment_status === "paid" ? "active" : "incomplete",
    })
    return
  }

  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription.id

  const subscription = await getStripe().subscriptions.retrieve(subscriptionId)
  await saveSubscription(subscription, userId)
}

async function onCheckoutExpired(session: Stripe.Checkout.Session) {
  const userId =
    session.metadata?.user_id ?? session.client_reference_id ?? null
  if (!userId) return

  const existing = await getSubscriptionByUserId(userId)
  if (
    existing &&
    existing.status !== "none" &&
    existing.status !== "incomplete"
  ) {
    return
  }

  await upsertUserSubscription({
    userId,
    stripeCustomerId: customerIdFrom(session.customer),
    status: "incomplete_expired",
  })
}

async function onCustomerCreated(customer: Stripe.Customer) {
  const userId = customer.metadata?.user_id
  if (!userId) return

  const existing = await getSubscriptionByUserId(userId)
  await upsertUserSubscription({
    userId,
    stripeCustomerId: customer.id,
    status: existing?.status ?? "none",
    stripeSubscriptionId: existing?.stripe_subscription_id ?? null,
    stripePriceId: existing?.stripe_price_id ?? null,
    currentPeriodEnd: existing?.current_period_end ?? null,
    cancelAtPeriodEnd: existing?.cancel_at_period_end ?? false,
  })
}

async function onCustomerUpdated(customer: Stripe.Customer) {
  const existing = await getSubscriptionByStripeCustomerId(customer.id)
  const userId = customer.metadata?.user_id ?? existing?.user_id
  if (!userId) return

  await upsertUserSubscription({
    userId,
    stripeCustomerId: customer.id,
    status: (existing?.status ?? "none") as SubscriptionStatus,
    stripeSubscriptionId: existing?.stripe_subscription_id ?? null,
    stripePriceId: existing?.stripe_price_id ?? null,
    currentPeriodEnd: existing?.current_period_end ?? null,
    cancelAtPeriodEnd: existing?.cancel_at_period_end ?? false,
  })
}

async function onCustomerDeleted(
  customer: Stripe.Customer | Stripe.DeletedCustomer
) {
  const existing = await getSubscriptionByStripeCustomerId(customer.id)
  if (!existing) return

  await upsertUserSubscription({
    userId: existing.user_id,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    stripePriceId: null,
    status: "canceled",
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
  })
}

async function onInvoice(invoice: Stripe.Invoice) {
  const subscriptionRef = (
    invoice as Stripe.Invoice & {
      subscription?: string | Stripe.Subscription | null
    }
  ).subscription

  if (!subscriptionRef) return

  const subscriptionId =
    typeof subscriptionRef === "string" ? subscriptionRef : subscriptionRef.id

  const subscription = await getStripe().subscriptions.retrieve(subscriptionId)
  await saveSubscription(subscription)
}

export async function processStripeWebhookEvent(event: Stripe.Event) {
  const alreadyProcessed = !(await markWebhookEventProcessed(
    event.id,
    event.type
  ))
  if (alreadyProcessed) {
    return { received: true, duplicate: true }
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await onCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break
      case "checkout.session.expired":
        await onCheckoutExpired(event.data.object as Stripe.Checkout.Session)
        break
      case "customer.created":
        await onCustomerCreated(event.data.object as Stripe.Customer)
        break
      case "customer.updated":
        await onCustomerUpdated(event.data.object as Stripe.Customer)
        break
      case "customer.deleted":
        await onCustomerDeleted(
          event.data.object as Stripe.Customer | Stripe.DeletedCustomer
        )
        break
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
      case "customer.subscription.paused":
      case "customer.subscription.resumed":
        await saveSubscription(event.data.object as Stripe.Subscription)
        break
      case "invoice.finalized":
      case "invoice.paid":
        await onInvoice(event.data.object as Stripe.Invoice)
        break
      case "payment_intent.succeeded":
        break
      default:
        break
    }
  } catch (error) {
    // Allow Stripe to retry if handling failed after we reserved the event id.
    const supabase = (await import("@/lib/supabase/admin")).createAdminClient()
    await supabase.from("stripe_webhook_events").delete().eq("id", event.id)
    throw error
  }

  return { received: true }
}

export function constructStripeEvent(
  payload: string,
  signature: string
): Stripe.Event {
  return getStripe().webhooks.constructEvent(
    payload,
    signature,
    getStripeWebhookSecret()
  )
}
