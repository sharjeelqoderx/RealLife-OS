import type Stripe from "stripe"

import {
  getSubscriptionByCustomerId,
  getSubscriptionByUserId,
  saveCustomerId,
  saveSubscription,
  saveWebhookEvent,
  webhookEventExists,
} from "@/lib/services/billing/subscriptions"
import { getStripe } from "@/lib/stripe/client"
import { getStripeWebhookSecret } from "@/lib/env"
import type { SubscriptionStatus } from "@/types/billing"

function asCustomerId(
  value: string | Stripe.Customer | Stripe.DeletedCustomer | null
): string | null {
  if (!value) return null
  return typeof value === "string" ? value : value.id
}

function asSubscriptionId(
  value: string | Stripe.Subscription | null | undefined
): string | null {
  if (!value) return null
  return typeof value === "string" ? value : value.id
}

function periodEnd(subscription: Stripe.Subscription): string | null {
  const item = subscription.items.data[0] as
    | (Stripe.SubscriptionItem & { current_period_end?: number })
    | undefined
  const unix = item?.current_period_end
  return typeof unix === "number" ? new Date(unix * 1000).toISOString() : null
}

function priceId(subscription: Stripe.Subscription): string | null {
  return subscription.items.data[0]?.price?.id ?? null
}

async function userIdFor(
  metadataUserId: string | null | undefined,
  stripeCustomerId: string | null
) {
  if (metadataUserId) return metadataUserId
  if (!stripeCustomerId) return null
  const row = await getSubscriptionByCustomerId(stripeCustomerId)
  return row?.user_id ?? null
}

/** Write full subscription row from a Stripe Subscription. */
async function writeSubscription(
  userId: string,
  subscription: Stripe.Subscription
) {
  await saveSubscription({
    userId,
    stripeCustomerId: asCustomerId(subscription.customer),
    stripeSubscriptionId: subscription.id,
    stripePriceId: priceId(subscription),
    status: subscription.status as SubscriptionStatus,
    currentPeriodEnd: periodEnd(subscription),
    cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
  })
}

async function writeSubscriptionById(
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

function invoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
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

// ─── Event handlers ──────────────────────────────────────────────────────────

async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
) {
  const userId =
    session.metadata?.user_id ?? session.client_reference_id ?? null
  if (!userId) return

  const subscriptionId = asSubscriptionId(session.subscription)
  if (!subscriptionId) return

  await writeSubscriptionById(subscriptionId, userId)
}

async function handleCheckoutSessionExpired(
  session: Stripe.Checkout.Session
) {
  const userId =
    session.metadata?.user_id ?? session.client_reference_id ?? null
  if (!userId) return

  const existing = await getSubscriptionByUserId(userId)
  if (existing?.stripe_subscription_id) return
  if (existing?.status === "active" || existing?.status === "trialing") return

  await saveSubscription({
    userId,
    stripeCustomerId:
      asCustomerId(session.customer) ?? existing?.stripe_customer_id ?? null,
    stripeSubscriptionId: null,
    stripePriceId: existing?.stripe_price_id ?? null,
    status: "incomplete_expired",
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
  })
}

async function handleCustomerCreated(customer: Stripe.Customer) {
  const userId = customer.metadata?.user_id
  if (!userId) return
  await saveCustomerId(userId, customer.id)
}

async function handleCustomerUpdated(customer: Stripe.Customer) {
  const existing = await getSubscriptionByCustomerId(customer.id)
  const userId = customer.metadata?.user_id ?? existing?.user_id
  if (!userId) return
  await saveCustomerId(userId, customer.id)
}

async function handleCustomerDeleted(
  customer: Stripe.Customer | Stripe.DeletedCustomer
) {
  const existing = await getSubscriptionByCustomerId(customer.id)
  if (!existing) return

  await saveSubscription({
    userId: existing.user_id,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    stripePriceId: null,
    status: "canceled",
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
  })
}

async function handleSubscriptionEvent(subscription: Stripe.Subscription) {
  const userId = await userIdFor(
    subscription.metadata?.user_id,
    asCustomerId(subscription.customer)
  )
  if (!userId) return
  await writeSubscription(userId, subscription)
}

async function handleInvoiceEvent(invoice: Stripe.Invoice) {
  const subscriptionId = invoiceSubscriptionId(invoice)
  if (!subscriptionId) return
  await writeSubscriptionById(subscriptionId)
}

async function handlePaymentIntentSucceeded(
  _paymentIntent: Stripe.PaymentIntent
) {
  // Subscription state is written by checkout / subscription / invoice events.
}

// ─── Entry ───────────────────────────────────────────────────────────────────

export function constructStripeEvent(payload: string, signature: string) {
  return getStripe().webhooks.constructEvent(
    payload,
    signature,
    getStripeWebhookSecret()
  )
}

export async function processStripeWebhookEvent(event: Stripe.Event) {
  if (await webhookEventExists(event.id)) {
    return { received: true, duplicate: true }
  }

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
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
    case "customer.subscription.paused":
    case "customer.subscription.resumed":
      await handleSubscriptionEvent(
        event.data.object as Stripe.Subscription
      )
      break
    case "invoice.finalized":
    case "invoice.paid":
      await handleInvoiceEvent(event.data.object as Stripe.Invoice)
      break
    case "payment_intent.succeeded":
      await handlePaymentIntentSucceeded(
        event.data.object as Stripe.PaymentIntent
      )
      break
    default:
      break
  }

  await saveWebhookEvent(event.id, event.type)
  return { received: true }
}
