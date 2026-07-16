import { getSiteUrl } from "@/lib/env"
import { getStripe } from "@/lib/stripe/client"
import { getPlanById, type BillingPlanId } from "@/lib/stripe/plans"
import { getPlanPriceId } from "@/lib/stripe/prices"
import {
  getSubscriptionByUserId,
  upsertUserSubscription,
} from "@/lib/services/billing/subscriptions"
import { createClient } from "@/lib/supabase/server"

export class BillingServiceError extends Error {
  status: number
  code: string

  constructor(message: string, status = 400, code = "BILLING_ERROR") {
    super(message)
    this.name = "BillingServiceError"
    this.status = status
    this.code = code
  }
}

async function requireAuthUser() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    throw new BillingServiceError("Unauthorized", 401, "UNAUTHORIZED")
  }

  return user
}

async function ensureStripeCustomer(userId: string, email: string) {
  const existing = await getSubscriptionByUserId(userId)

  if (existing?.stripe_customer_id) {
    return existing.stripe_customer_id
  }

  const customer = await getStripe().customers.create({
    email,
    metadata: { user_id: userId },
  })

  await upsertUserSubscription({
    userId,
    stripeCustomerId: customer.id,
    status: existing?.status ?? "none",
  })

  return customer.id
}

export async function createCheckoutSession(
  planId: BillingPlanId = "basic_monthly",
  options?: { returnOrigin?: string }
) {
  const user = await requireAuthUser()

  if (!user.email) {
    throw new BillingServiceError(
      "Your account is missing an email address",
      400,
      "MISSING_EMAIL"
    )
  }

  getPlanById(planId)
  const priceId = getPlanPriceId(planId)
  const customerId = await ensureStripeCustomer(user.id, user.email)
  const origin = (options?.returnOrigin ?? getSiteUrl()).replace(/\/$/, "")

  const session = await getStripe().checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/dashboard?checkout=success`,
    cancel_url: `${origin}/dashboard?checkout=canceled`,
    client_reference_id: user.id,
    metadata: {
      user_id: user.id,
      plan_id: planId,
    },
    subscription_data: {
      metadata: {
        user_id: user.id,
        plan_id: planId,
      },
    },
    allow_promotion_codes: true,
  })

  if (!session.url) {
    throw new BillingServiceError(
      "Stripe did not return a checkout URL",
      502,
      "CHECKOUT_URL_MISSING"
    )
  }

  return { url: session.url }
}
