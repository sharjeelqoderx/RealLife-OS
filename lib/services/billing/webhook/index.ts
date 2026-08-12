import type Stripe from "stripe"

import {
  saveWebhookEvent,
  webhookEventExists,
} from "@/lib/services/billing/subscriptions"
import { getStripe } from "@/lib/stripe/client"
import { getStripeWebhookSecret } from "@/lib/env"

import { handleCheckoutSessionCompleted } from "./handle-checkout-session-completed"
import { handleCheckoutSessionExpired } from "./handle-checkout-session-expired"
import { handleCustomerCreated } from "./handle-customer-created"
import { handleCustomerDeleted } from "./handle-customer-deleted"
import { handleCustomerSubscriptionCreated } from "./handle-customer-subscription-created"
import { handleCustomerSubscriptionDeleted } from "./handle-customer-subscription-deleted"
import { handleCustomerSubscriptionPaused } from "./handle-customer-subscription-paused"
import { handleCustomerSubscriptionResumed } from "./handle-customer-subscription-resumed"
import { handleCustomerSubscriptionUpdated } from "./handle-customer-subscription-updated"
import { handleCustomerUpdated } from "./handle-customer-updated"
import { handleInvoiceFinalized } from "./handle-invoice-finalized"
import { handleInvoicePaid } from "./handle-invoice-paid"
import { handlePaymentIntentSucceeded } from "./handle-payment-intent-succeeded"

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

  await saveWebhookEvent(event.id, event.type)
  return { received: true }
}
