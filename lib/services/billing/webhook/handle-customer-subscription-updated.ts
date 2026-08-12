import type Stripe from "stripe"

import {
  asCustomerId,
  userIdFor,
  writeSubscription,
} from "@/lib/services/billing/webhook/helpers"

export async function handleCustomerSubscriptionUpdated(
  subscription: Stripe.Subscription
) {
  const userId = await userIdFor(
    subscription.metadata?.user_id,
    asCustomerId(subscription.customer)
  )
  if (!userId) return
  await writeSubscription(userId, subscription)
}
