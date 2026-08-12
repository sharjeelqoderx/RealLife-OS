import type Stripe from "stripe"

import {
  invoiceSubscriptionId,
  writeSubscriptionById,
} from "@/lib/services/billing/webhook/helpers"

export async function handleInvoiceFinalized(invoice: Stripe.Invoice) {
  const subscriptionId = invoiceSubscriptionId(invoice)
  if (!subscriptionId) return
  await writeSubscriptionById(subscriptionId)
}
