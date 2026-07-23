import {
  createBillingPortalSession,
} from "@/lib/services/billing/details"
import { BillingError } from "@/lib/services/billing/checkout"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const origin = request.headers.get("origin")?.replace(/\/$/, "")
  const returnUrl = origin ? `${origin}/billing?portal=return` : undefined

  if (!returnUrl) {
    return Response.json({ error: "Missing origin" }, { status: 400 })
  }

  try {
    const result = await createBillingPortalSession(user.id, returnUrl)
    return Response.json(result)
  } catch (error) {
    if (error instanceof BillingError) {
      return Response.json(
        { error: error.message, code: error.code },
        { status: error.status }
      )
    }

    const message =
      error instanceof Error ? error.message : "Billing portal failed"
    return Response.json({ error: message }, { status: 500 })
  }
}
