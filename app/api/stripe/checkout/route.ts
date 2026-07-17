import {
  BillingError,
  createCheckoutSession,
} from "@/lib/services/billing/checkout"
import { createCheckoutSessionSchema } from "@/schemas/billing/checkout"

export async function POST(request: Request) {
  const origin = request.headers.get("origin") ?? undefined

  let body: unknown = {}
  try {
    const text = await request.text()
    body = text ? JSON.parse(text) : {}
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = createCheckoutSessionSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  try {
    const result = await createCheckoutSession(parsed.data.planId, origin)
    return Response.json(result)
  } catch (error) {
    if (error instanceof BillingError) {
      return Response.json(
        { error: error.message, code: error.code },
        { status: error.status }
      )
    }

    const message =
      error instanceof Error ? error.message : "Checkout failed"
    return Response.json({ error: message }, { status: 500 })
  }
}
