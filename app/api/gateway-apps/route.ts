import { NextResponse } from "next/server"

import { listGatewayAppPickerGroups } from "@/lib/services/cloudflare/app-types"
import { getPolicyCloudflareAccountId } from "@/lib/services/content-policies/gateway-policies"
import { createClient } from "@/lib/supabase/server"

/**
 * List Cloudflare Gateway applications (app_types) as picker groups.
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

    const accountId = await getPolicyCloudflareAccountId(user.id)
    const groups = await listGatewayAppPickerGroups(accountId)
    return NextResponse.json({ groups })
  } catch (error) {
    console.error("GET /api/gateway-apps:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch gateway apps",
      },
      { status: 500 }
    )
  }
}
