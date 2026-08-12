import type Stripe from "stripe"

import { getSubscriptionByCustomerId } from "@/lib/services/billing/webhook/helpers"
import { saveSubscription } from "@/lib/services/billing/subscriptions"

export async function handleCustomerDeleted(
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
