import {
  constructStripeEvent,
  processStripeWebhookEvent,
} from "@/lib/services/billing/webhook"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature")

  if (!signature) {
    return Response.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    )
  }

  const payload = await request.text()

  let event
  try {
    event = constructStripeEvent(payload, signature)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid webhook signature"
    console.error("[stripe webhook] signature verification failed:", message)
    return Response.json({ error: message }, { status: 400 })
  }

  try {
    const result = await processStripeWebhookEvent(event)
    return Response.json(result)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Webhook processing failed"
    console.error("[stripe webhook] processing error:", message)
    return Response.json({ error: message }, { status: 500 })
  }
}
