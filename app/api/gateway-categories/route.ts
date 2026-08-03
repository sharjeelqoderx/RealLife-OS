import { NextResponse } from "next/server"

import { listGatewayCategoryPickerGroups } from "@/lib/services/cloudflare/category-picker"
import { resolvePolicyAccountId } from "@/lib/services/content-policies/gateway-policies"
import { createClient } from "@/lib/supabase/server"

/**
 * List Cloudflare Gateway content categories as picker groups.
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
    const groups = await listGatewayCategoryPickerGroups(accountId)
    return NextResponse.json({ groups })
  } catch (error) {
    console.error("GET /api/gateway-categories:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch gateway categories",
      },
      { status: 500 }
    )
  }
}
