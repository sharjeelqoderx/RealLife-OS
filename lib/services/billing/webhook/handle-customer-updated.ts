import type Stripe from "stripe"

import {
  getSubscriptionByCustomerId,
  saveCustomerId,
} from "@/lib/services/billing/webhook/helpers"

export async function handleCustomerUpdated(customer: Stripe.Customer) {
  const existing = await getSubscriptionByCustomerId(customer.id)
  const userId = customer.metadata?.user_id ?? existing?.user_id
  if (!userId) return
  await saveCustomerId(userId, customer.id)
}
