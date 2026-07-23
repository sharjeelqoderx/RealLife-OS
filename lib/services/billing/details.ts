import type Stripe from "stripe"

import {
  getStripePriceBasicMonthly,
  getStripePriceFamilyMonthly,
} from "@/lib/env"
import { getStripe } from "@/lib/stripe/client"
import { getPlanDisplayName } from "@/lib/stripe/plans"
import type { PaymentMethodInfo } from "@/schemas/billing/details"

import { BillingError } from "./checkout"
import {
  getBillingStatus,
  getSubscriptionByUserId,
} from "./subscriptions"

function resolvePlanName(stripePriceId: string | null): string {
  if (!stripePriceId || stripePriceId === "personal_trial") {
    return getPlanDisplayName(stripePriceId)
  }

  if (stripePriceId === getStripePriceBasicMonthly()) {
    return "Willpower Pro"
  }

  if (stripePriceId === getStripePriceFamilyMonthly()) {
    return "Family Pack"
  }

  return getPlanDisplayName(stripePriceId)
}

function cardFromPaymentMethod(
  paymentMethod: Stripe.PaymentMethod
): PaymentMethodInfo | null {
  if (paymentMethod.type !== "card" || !paymentMethod.card) {
    return null
  }

  return {
    brand: paymentMethod.card.brand,
    last4: paymentMethod.card.last4,
    expMonth: paymentMethod.card.exp_month,
    expYear: paymentMethod.card.exp_year,
    cardholderName: paymentMethod.billing_details?.name?.trim() || null,
  }
}

async function getCustomerPaymentMethod(
  customerId: string
): Promise<PaymentMethodInfo | null> {
  const stripe = getStripe()
  const customer = await stripe.customers.retrieve(customerId, {
    expand: ["invoice_settings.default_payment_method"],
  })

  if (customer.deleted) {
    return null
  }

  const defaultPaymentMethod = customer.invoice_settings?.default_payment_method

  if (defaultPaymentMethod && typeof defaultPaymentMethod !== "string") {
    const card = cardFromPaymentMethod(defaultPaymentMethod)
    if (card) return card
  }

  const methods = await stripe.paymentMethods.list({
    customer: customerId,
    type: "card",
    limit: 1,
  })

  const first = methods.data[0]
  return first ? cardFromPaymentMethod(first) : null
}

export async function getBillingDetails(userId: string) {
  const status = await getBillingStatus(userId)
  const row = await getSubscriptionByUserId(userId)
  const customerId = row?.stripe_customer_id ?? null

  let paymentMethod: PaymentMethodInfo | null = null

  if (customerId) {
    paymentMethod = await getCustomerPaymentMethod(customerId).catch(() => null)
  }

  return {
    ...status,
    planName: resolvePlanName(status.planId),
    paymentMethod,
    canManagePayment: Boolean(customerId),
    needsPaymentMethod: !paymentMethod && status.hasAccess,
  }
}

export async function createBillingPortalSession(
  userId: string,
  returnUrl: string
) {
  const row = await getSubscriptionByUserId(userId)

  if (!row?.stripe_customer_id) {
    throw new BillingError(
      "No billing account found. Add a card to continue.",
      400,
      "NO_CUSTOMER"
    )
  }

  const session = await getStripe().billingPortal.sessions.create({
    customer: row.stripe_customer_id,
    return_url: returnUrl,
  })

  if (!session.url) {
    throw new BillingError("No portal URL", 502, "NO_PORTAL_URL")
  }

  return { url: session.url }
}
