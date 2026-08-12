import type Stripe from "stripe"

import { saveCustomerId } from "@/lib/services/billing/webhook/helpers"

export async function handleCustomerCreated(customer: Stripe.Customer) {
  const userId = customer.metadata?.user_id
  if (!userId) return
  await saveCustomerId(userId, customer.id)
}
