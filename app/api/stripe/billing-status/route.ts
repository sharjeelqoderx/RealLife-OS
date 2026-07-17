import { getBillingStatus } from "@/lib/services/billing/subscriptions"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    return Response.json(await getBillingStatus(user.id))
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Billing status failed"
    return Response.json({ error: message }, { status: 500 })
  }
}
