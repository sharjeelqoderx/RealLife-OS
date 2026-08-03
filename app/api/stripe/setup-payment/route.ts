import {
  BillingError,
  createPaymentSetupSession,
} from "@/lib/services/billing/checkout"

export async function POST(request: Request) {
  const origin = request.headers.get("origin") ?? undefined

  try {
    const result = await createPaymentSetupSession(origin)
    return Response.json(result)
  } catch (error) {
    if (error instanceof BillingError) {
      return Response.json(
        { error: error.message, code: error.code },
        { status: error.status }
      )
    }

    const message =
      error instanceof Error ? error.message : "Payment setup failed"
    return Response.json({ error: message }, { status: 500 })
  }
}
