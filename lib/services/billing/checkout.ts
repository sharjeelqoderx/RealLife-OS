import type { User } from "@supabase/supabase-js"

import { getSiteUrl, getStripePriceForPlan } from "@/lib/env"
import { getStripe } from "@/lib/stripe/client"
import {
  getBillingPlan,
  type PaidBillingPlanId,
} from "@/lib/stripe/plans"
import {
  getBillingStatus,
  getSubscriptionByUserId,
  saveCustomerId,
} from "@/lib/services/billing/subscriptions"
import {
  asCustomerId,
  asSubscriptionId,
  setDefaultPaymentMethodFromSetup,
  startFreeTrial,
  writeSubscriptionById,
} from "@/lib/services/billing/webhook/helpers"
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
    metadata: { user_id: user.id, plan_id: "free_trial" },
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
  planId: PaidBillingPlanId,
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
      metadata: {
        user_id: user.id,
        plan_id: planId,
        device_limit: String(plan.deviceLimit),
      },
    },
  })

  if (!session.url) {
    throw new BillingError("No checkout URL", 502, "NO_CHECKOUT_URL")
  }

  return { url: session.url }
}

/**
 * After Stripe Checkout redirect: activate trial / sync subscription without
 * waiting for the webhook, so the paywall does not stay up during a valid trial.
 */
export async function confirmCheckoutReturn() {
  const user = await getAuthUser()
  const current = await getBillingStatus(user.id)
  if (current.hasAccess) {
    return current
  }

  const row = await getSubscriptionByUserId(user.id)
  const customerId = row?.stripe_customer_id
  if (!customerId) {
    return current
  }

  const sessions = await getStripe().checkout.sessions.list({
    customer: customerId,
    limit: 10,
  })

  const ownedSessions = sessions.data.filter(
    (session) =>
      session.status === "complete" &&
      (session.metadata?.user_id === user.id ||
        session.client_reference_id === user.id)
  )

  const trialSession = ownedSessions.find(
    (session) =>
      session.mode === "setup" &&
      (session.metadata?.plan_id === "free_trial" ||
        session.metadata?.plan_id === "personal")
  )

  if (trialSession) {
    await setDefaultPaymentMethodFromSetup(
      customerId,
      trialSession.setup_intent
    )
    await startFreeTrial(
      user.id,
      asCustomerId(trialSession.customer) ?? customerId
    )
    return getBillingStatus(user.id)
  }

  const paidSession = ownedSessions.find(
    (session) => session.mode === "subscription"
  )
  if (paidSession) {
    const subscriptionId = asSubscriptionId(paidSession.subscription)
    if (subscriptionId) {
      await writeSubscriptionById(subscriptionId, user.id)
    }
  }

  return getBillingStatus(user.id)
}
