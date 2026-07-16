import { getBillingStatusForUser } from "@/lib/services/billing/subscriptions"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return Response.json(
      { error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 }
    )
  }

  try {
    const status = await getBillingStatusForUser(user.id)
    return Response.json(status)
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load billing status"
    console.error("[billing status]", message)
    return Response.json({ error: message }, { status: 500 })
  }
}
