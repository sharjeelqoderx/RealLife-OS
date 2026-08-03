import { NextResponse } from "next/server"

import { listGatewayPresets } from "@/lib/services/content-policies/gateway-presets"
import { resolvePolicyAccountId } from "@/lib/services/content-policies/gateway-policies"
import { createClient } from "@/lib/supabase/server"

/**
 * List curated Gateway policy presets resolved against live Cloudflare
 * categories/apps for the current account.
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const accountId = await resolvePolicyAccountId(user.id)
    const presets = await listGatewayPresets(accountId)
    return NextResponse.json({ presets })
  } catch (error) {
    console.error("GET /api/gateway-presets:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch gateway presets",
      },
      { status: 500 }
    )
  }
}
