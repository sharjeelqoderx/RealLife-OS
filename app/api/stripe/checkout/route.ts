import {
  BillingServiceError,
  createCheckoutSession,
} from "@/lib/services/billing/checkout"
import {
  createCheckoutSessionSchema,
} from "@/schemas/billing/checkout"

function resolveReturnOrigin(request: Request): string | undefined {
  const origin = request.headers.get("origin")
  if (origin) {
    return origin
  }

  const referer = request.headers.get("referer")
  if (!referer) {
    return undefined
  }

  try {
    return new URL(referer).origin
  } catch {
    return undefined
  }
}

export async function POST(request: Request) {
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
    const result = await createCheckoutSession(parsed.data.planId, {
      returnOrigin: resolveReturnOrigin(request),
    })
    return Response.json(result)
  } catch (error) {
    if (error instanceof BillingServiceError) {
      return Response.json(
        { error: error.message, code: error.code },
        { status: error.status }
      )
    }

    const message =
      error instanceof Error ? error.message : "Failed to create checkout"
    console.error("[stripe checkout]", message)
    return Response.json({ error: message }, { status: 500 })
  }
}
