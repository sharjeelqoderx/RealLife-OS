import Stripe from "stripe"

import { getStripeSecretKey } from "@/lib/env"

let stripeClient: Stripe | null = null

export function getStripe(): Stripe {
  if (!stripeClient) {
    stripeClient = new Stripe(getStripeSecretKey(), {
      typescript: true,
    })
  }

  return stripeClient
}
