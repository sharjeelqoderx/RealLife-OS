import { getStripePriceBasicMonthly } from "@/lib/env"
import { getSiteUrl } from "@/lib/env"
import { getStripe } from "@/lib/stripe/client"
import { getSubscriptionByUserId } from "@/lib/services/billing/subscriptions"
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

/**
 * Creates a Stripe Checkout session for the logged-in user.
 * Does not write to our DB — webhooks own subscription rows.
 */
export async function createCheckoutSession(returnOrigin?: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) {
    throw new BillingError("Unauthorized", 401, "UNAUTHORIZED")
  }

  const stripe = getStripe()
  const existing = await getSubscriptionByUserId(user.id)

  // Reuse Stripe customer if webhook already stored one; otherwise create once.
  let customerId = existing?.stripe_customer_id ?? null
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { user_id: user.id },
    })
    customerId = customer.id
  }

  const origin = (returnOrigin ?? getSiteUrl()).replace(/\/$/, "")

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: getStripePriceBasicMonthly(), quantity: 1 }],
    success_url: `${origin}/dashboard?checkout=success`,
    cancel_url: `${origin}/dashboard?checkout=canceled`,
    client_reference_id: user.id,
    metadata: { user_id: user.id },
    subscription_data: {
      metadata: { user_id: user.id },
    },
  })

  if (!session.url) {
    throw new BillingError("No checkout URL from Stripe", 502, "NO_CHECKOUT_URL")
  }

  return { url: session.url }
}
