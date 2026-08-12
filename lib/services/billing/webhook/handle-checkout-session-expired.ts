import type Stripe from "stripe"

import {
  asCustomerId,
  getSubscriptionByUserId,
} from "@/lib/services/billing/webhook/helpers"
import { saveSubscription } from "@/lib/services/billing/subscriptions"

export async function handleCheckoutSessionExpired(
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
