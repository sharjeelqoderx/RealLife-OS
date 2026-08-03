import type { User } from "@supabase/supabase-js"

import { getSiteUrl, getStripePriceForPlan } from "@/lib/env"
import { getStripe } from "@/lib/stripe/client"
import {
  getBillingPlan,
  type BillingPlanId,
} from "@/lib/stripe/plans"
import {
  getBillingStatus,
  getSubscriptionByUserId,
  saveCustomerId,
} from "@/lib/services/billing/subscriptions"
import { createClient } from "@/lib/supabase/server"

export class BillingError extends Error {
  constructor(
    message: string,
    public status = 400,
    public code = "BILLING_ERROR"
  ) {
    super(message)
    this.name = "BillingError"
  }
}

async function getAuthUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) {
    throw new BillingError("Unauthorized", 401, "UNAUTHORIZED")
  }

  return user
}

/** Use DB customer, else existing Stripe customer by email, else create once. */
async function getStripeCustomerId(user: User): Promise<string> {
  const stripe = getStripe()
  const email = user.email!
  const row = await getSubscriptionByUserId(user.id)

  if (row?.stripe_customer_id) {
    return row.stripe_customer_id
  }

  const existing = await stripe.customers.list({ email, limit: 1 })
  if (existing.data[0]) {
    await saveCustomerId(user.id, existing.data[0].id)
    return existing.data[0].id
  }

  const customer = await stripe.customers.create({
    email,
    metadata: { user_id: user.id },
  })
  await saveCustomerId(user.id, customer.id)
  return customer.id
}

export async function createTrialCheckoutSession(returnOrigin?: string) {
  const user = await getAuthUser()
  const status = await getBillingStatus(user.id)

  if (status.hasAccess) {
    throw new BillingError("You already have access", 409, "ALREADY_ACTIVE")
  }

  const customerId = await getStripeCustomerId(user)
  const origin = (returnOrigin ?? getSiteUrl()).replace(/\/$/, "")

  const session = await getStripe().checkout.sessions.create({
    mode: "setup",
    customer: customerId,
    payment_method_types: ["card"],
    success_url: `${origin}/dashboard?checkout=success`,
    cancel_url: `${origin}/dashboard?checkout=canceled`,
    client_reference_id: user.id,
    metadata: { user_id: user.id, plan_id: "personal" },
  })

  if (!session.url) {
    throw new BillingError("No checkout URL", 502, "NO_CHECKOUT_URL")
  }

  return { url: session.url }
}

export async function createPaymentSetupSession(returnOrigin?: string) {
  const user = await getAuthUser()
  const customerId = await getStripeCustomerId(user)
  const origin = (returnOrigin ?? getSiteUrl()).replace(/\/$/, "")

  const session = await getStripe().checkout.sessions.create({
    mode: "setup",
    customer: customerId,
    payment_method_types: ["card"],
    success_url: `${origin}/billing?portal=return`,
    cancel_url: `${origin}/billing`,
    client_reference_id: user.id,
    metadata: { user_id: user.id, plan_id: "payment_setup" },
  })

  if (!session.url) {
    throw new BillingError("No checkout URL", 502, "NO_CHECKOUT_URL")
  }

  return { url: session.url }
}

export async function createCheckoutSession(
  planId: Extract<BillingPlanId, "willpower_pro" | "family_pack">,
  returnOrigin?: string
) {
  const user = await getAuthUser()
  const plan = getBillingPlan(planId)

  if (plan.kind !== "paid") {
    throw new BillingError("Invalid paid plan", 400, "INVALID_PLAN")
  }

  const customerId = await getStripeCustomerId(user)
  const origin = (returnOrigin ?? getSiteUrl()).replace(/\/$/, "")

  const session = await getStripe().checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: getStripePriceForPlan(planId), quantity: 1 }],
    success_url: `${origin}/dashboard?checkout=success`,
    cancel_url: `${origin}/dashboard?checkout=canceled`,
    client_reference_id: user.id,
    metadata: { user_id: user.id, plan_id: planId },
    subscription_data: {
      metadata: { user_id: user.id, plan_id: planId },
    },
  })

  if (!session.url) {
    throw new BillingError("No checkout URL", 502, "NO_CHECKOUT_URL")
  }

  return { url: session.url }
}
