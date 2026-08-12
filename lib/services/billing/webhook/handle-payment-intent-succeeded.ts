import type Stripe from "stripe"

export async function handlePaymentIntentSucceeded(
  _paymentIntent: Stripe.PaymentIntent
) {
  // Subscription state is written by checkout / subscription / invoice events.
}
