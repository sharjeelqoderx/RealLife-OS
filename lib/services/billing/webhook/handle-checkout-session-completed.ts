import type Stripe from "stripe"

import {
  asCustomerId,
  asSubscriptionId,
  saveCustomerId,
  setDefaultPaymentMethodFromSetup,
  startFreeTrial,
  writeSubscriptionById,
} from "@/lib/services/billing/webhook/helpers"

export async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
) {
  const userId =
    session.metadata?.user_id ?? session.client_reference_id ?? null
  if (!userId) return

  const customerId = asCustomerId(session.customer)

  if (session.mode === "setup") {
    if (customerId) {
      await saveCustomerId(userId, customerId)
      await setDefaultPaymentMethodFromSetup(customerId, session.setup_intent)
    }

    const planId = session.metadata?.plan_id
    if (planId === "free_trial" || planId === "personal") {
      await startFreeTrial(userId, customerId)
    }

    return
  }

  const subscriptionId = asSubscriptionId(session.subscription)
  if (!subscriptionId) return

  await writeSubscriptionById(subscriptionId, userId)
}
