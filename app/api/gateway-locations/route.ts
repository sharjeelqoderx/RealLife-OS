import { NextResponse } from "next/server"

import { listGatewayAudiencePickerGroups } from "@/lib/services/cloudflare/audience-picker"
import { resolvePolicyAccountId } from "@/lib/services/content-policies/gateway-policies"
import { createClient } from "@/lib/supabase/server"

/**
 * List Gateway DNS locations as Audience picker groups (per-device scope).
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
    const groups = await listGatewayAudiencePickerGroups(accountId)
    return NextResponse.json({ groups })
  } catch (error) {
    console.error("GET /api/gateway-locations:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch gateway locations",
      },
      { status: 500 }
    )
  }
}
