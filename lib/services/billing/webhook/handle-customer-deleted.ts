import type Stripe from "stripe"

import { getSubscriptionByCustomerId } from "@/lib/services/billing/webhook/helpers"
import { saveSubscription } from "@/lib/services/billing/subscriptions"
import { createAdminClient } from "@/lib/supabase/admin"
import { isLocalFreeTrialRow } from "@/types/billing"

export async function handleCustomerDeleted(
  customer: Stripe.Customer | Stripe.DeletedCustomer
) {
  const existing = await getSubscriptionByCustomerId(customer.id)
  if (!existing) return

  // Local free trial is not a Stripe subscription — never cancel access on customer delete.
  if (isLocalFreeTrialRow(existing)) {
    const { error } = await createAdminClient()
      .from("user_subscriptions")
      .update({ stripe_customer_id: null })
      .eq("user_id", existing.user_id)
    if (error) throw new Error(error.message)
    return
  }

  await saveSubscription({
    userId: existing.user_id,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    stripePriceId: null,
    status: "canceled",
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    deviceLimit: existing.device_limit,
  })
}
