import type Stripe from "stripe"

import {
  claimWebhookEvent,
  getSubscriptionByCustomerId,
  getSubscriptionByUserId,
  releaseWebhookEvent,
  upsertSubscription,
} from "@/lib/services/billing/subscriptions"
import { getStripe } from "@/lib/stripe/client"
import { getStripeWebhookSecret } from "@/lib/env"
import type { SubscriptionStatus } from "@/types/billing"

// ─── Stripe → DB mapping (used only by subscription-related handlers) ────────

function customerId(
  value: string | Stripe.Customer | Stripe.DeletedCustomer | null
): string | null {
  if (!value) return null
  return typeof value === "string" ? value : value.id
}

function periodEndIso(subscription: Stripe.Subscription): string | null {
  const item = subscription.items.data[0] as
    | (Stripe.SubscriptionItem & { current_period_end?: number })
    | undefined
  const unix = item?.current_period_end
  return typeof unix === "number" ? new Date(unix * 1000).toISOString() : null
}

function priceId(subscription: Stripe.Subscription): string | null {
  return subscription.items.data[0]?.price?.id ?? null
}

function statusOf(subscription: Stripe.Subscription): SubscriptionStatus {
  return subscription.status as SubscriptionStatus
}

async function findUserId(
  metadataUserId: string | null | undefined,
  stripeCustomerId: string | null
): Promise<string | null> {
  if (metadataUserId) return metadataUserId
  if (!stripeCustomerId) return null
  const row = await getSubscriptionByCustomerId(stripeCustomerId)
  return row?.user_id ?? null
}

async function upsertFromSubscription(
  userId: string,
  subscription: Stripe.Subscription
) {
  await upsertSubscription({
    userId,
    stripeCustomerId: customerId(subscription.customer),
    stripeSubscriptionId: subscription.id,
    stripePriceId: priceId(subscription),
    status: statusOf(subscription),
    currentPeriodEnd: periodEndIso(subscription),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  })
}

// ─── One handler per Stripe event ────────────────────────────────────────────

async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
) {
  const userId =
    session.metadata?.user_id ?? session.client_reference_id ?? null
  if (!userId || !session.subscription) return

  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription.id

  const subscription =
    await getStripe().subscriptions.retrieve(subscriptionId)

  await upsertFromSubscription(userId, subscription)
}

async function handleCheckoutSessionExpired(
  session: Stripe.Checkout.Session
) {
  const userId =
    session.metadata?.user_id ?? session.client_reference_id ?? null
  if (!userId) return

  const existing = await getSubscriptionByUserId(userId)
  if (existing?.status === "active" || existing?.status === "trialing") return

  await upsertSubscription({
    userId,
    stripeCustomerId: customerId(session.customer),
    stripeSubscriptionId: existing?.stripe_subscription_id ?? null,
    stripePriceId: existing?.stripe_price_id ?? null,
    status: "incomplete_expired",
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
  })
}

async function handleCustomerCreated(customer: Stripe.Customer) {
  const userId = customer.metadata?.user_id
  if (!userId) return

  const existing = await getSubscriptionByUserId(userId)

  await upsertSubscription({
    userId,
    stripeCustomerId: customer.id,
    stripeSubscriptionId: existing?.stripe_subscription_id ?? null,
    stripePriceId: existing?.stripe_price_id ?? null,
    status: existing?.status ?? "none",
    currentPeriodEnd: existing?.current_period_end ?? null,
    cancelAtPeriodEnd: existing?.cancel_at_period_end ?? false,
  })
}

async function handleCustomerUpdated(customer: Stripe.Customer) {
  const existing = await getSubscriptionByCustomerId(customer.id)
  const userId = customer.metadata?.user_id ?? existing?.user_id
  if (!userId) return

  await upsertSubscription({
    userId,
    stripeCustomerId: customer.id,
    stripeSubscriptionId: existing?.stripe_subscription_id ?? null,
    stripePriceId: existing?.stripe_price_id ?? null,
    status: existing?.status ?? "none",
    currentPeriodEnd: existing?.current_period_end ?? null,
    cancelAtPeriodEnd: existing?.cancel_at_period_end ?? false,
  })
}

async function handleCustomerDeleted(
  customer: Stripe.Customer | Stripe.DeletedCustomer
) {
  const existing = await getSubscriptionByCustomerId(customer.id)
  if (!existing) return

  await upsertSubscription({
    userId: existing.user_id,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    stripePriceId: null,
    status: "canceled",
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
  })
}

async function handleCustomerSubscriptionCreated(
  subscription: Stripe.Subscription
) {
  const userId = await findUserId(
    subscription.metadata?.user_id,
    customerId(subscription.customer)
  )
  if (!userId) return
  await upsertFromSubscription(userId, subscription)
}

async function handleCustomerSubscriptionUpdated(
  subscription: Stripe.Subscription
) {
  const userId = await findUserId(
    subscription.metadata?.user_id,
    customerId(subscription.customer)
  )
  if (!userId) return
  await upsertFromSubscription(userId, subscription)
}

async function handleCustomerSubscriptionDeleted(
  subscription: Stripe.Subscription
) {
  const userId = await findUserId(
    subscription.metadata?.user_id,
    customerId(subscription.customer)
  )
  if (!userId) return
  await upsertFromSubscription(userId, subscription)
}

async function handleCustomerSubscriptionPaused(
  subscription: Stripe.Subscription
) {
  const userId = await findUserId(
    subscription.metadata?.user_id,
    customerId(subscription.customer)
  )
  if (!userId) return
  await upsertFromSubscription(userId, subscription)
}

async function handleCustomerSubscriptionResumed(
  subscription: Stripe.Subscription
) {
  const userId = await findUserId(
    subscription.metadata?.user_id,
    customerId(subscription.customer)
  )
  if (!userId) return
  await upsertFromSubscription(userId, subscription)
}

async function handleInvoiceFinalized(invoice: Stripe.Invoice) {
  const ref = (
    invoice as Stripe.Invoice & {
      subscription?: string | Stripe.Subscription | null
    }
  ).subscription
  if (!ref) return

  const id = typeof ref === "string" ? ref : ref.id
  const subscription = await getStripe().subscriptions.retrieve(id)
  const userId = await findUserId(
    subscription.metadata?.user_id,
    customerId(subscription.customer)
  )
  if (!userId) return
  await upsertFromSubscription(userId, subscription)
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const ref = (
    invoice as Stripe.Invoice & {
      subscription?: string | Stripe.Subscription | null
    }
  ).subscription
  if (!ref) return

  const id = typeof ref === "string" ? ref : ref.id
  const subscription = await getStripe().subscriptions.retrieve(id)
  const userId = await findUserId(
    subscription.metadata?.user_id,
    customerId(subscription.customer)
  )
  if (!userId) return
  await upsertFromSubscription(userId, subscription)
}

async function handlePaymentIntentSucceeded(
  _paymentIntent: Stripe.PaymentIntent
) {
  // Access comes from checkout.session.completed / subscription / invoice events.
}

// ─── Router ──────────────────────────────────────────────────────────────────

export function constructStripeEvent(payload: string, signature: string) {
  return getStripe().webhooks.constructEvent(
    payload,
    signature,
    getStripeWebhookSecret()
  )
}

export async function processStripeWebhookEvent(event: Stripe.Event) {
  const isNew = await claimWebhookEvent(event.id, event.type)
  if (!isNew) return { received: true, duplicate: true }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(
          event.data.object as Stripe.Checkout.Session
        )
        break
      case "checkout.session.expired":
        await handleCheckoutSessionExpired(
          event.data.object as Stripe.Checkout.Session
        )
        break
      case "customer.created":
        await handleCustomerCreated(event.data.object as Stripe.Customer)
        break
      case "customer.updated":
        await handleCustomerUpdated(event.data.object as Stripe.Customer)
        break
      case "customer.deleted":
        await handleCustomerDeleted(
          event.data.object as Stripe.Customer | Stripe.DeletedCustomer
        )
        break
      case "customer.subscription.created":
        await handleCustomerSubscriptionCreated(
          event.data.object as Stripe.Subscription
        )
        break
      case "customer.subscription.updated":
        await handleCustomerSubscriptionUpdated(
          event.data.object as Stripe.Subscription
        )
        break
      case "customer.subscription.deleted":
        await handleCustomerSubscriptionDeleted(
          event.data.object as Stripe.Subscription
        )
        break
      case "customer.subscription.paused":
        await handleCustomerSubscriptionPaused(
          event.data.object as Stripe.Subscription
        )
        break
      case "customer.subscription.resumed":
        await handleCustomerSubscriptionResumed(
          event.data.object as Stripe.Subscription
        )
        break
      case "invoice.finalized":
        await handleInvoiceFinalized(event.data.object as Stripe.Invoice)
        break
      case "invoice.paid":
        await handleInvoicePaid(event.data.object as Stripe.Invoice)
        break
      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(
          event.data.object as Stripe.PaymentIntent
        )
        break
      default:
        break
    }
  } catch (error) {
    await releaseWebhookEvent(event.id)
    throw error
  }

  return { received: true }
}
