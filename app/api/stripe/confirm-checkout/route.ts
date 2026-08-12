import {
  BillingError,
  confirmCheckoutReturn,
} from "@/lib/services/billing/checkout"

export async function POST() {
  try {
    const status = await confirmCheckoutReturn()
    return Response.json(status)
  } catch (error) {
    if (error instanceof BillingError) {
      return Response.json(
        { error: error.message, code: error.code },
        { status: error.status }
      )
    }

    const message =
      error instanceof Error ? error.message : "Confirm checkout failed"
    return Response.json({ error: message }, { status: 500 })
  }
}
