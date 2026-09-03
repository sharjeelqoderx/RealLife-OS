import { NextResponse } from "next/server"

import { tryGetCloudflareAccountId } from "@/lib/cloudflare/config"
import {
  AdminServiceError,
  requireAdminUser,
} from "@/lib/services/admin/require-admin"
import { ensureGatewayBlockPageConfigured } from "@/lib/services/cloudflare/gateway-block-page"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST() {
  try {
    const admin = await requireAdminUser()
    const accountId = tryGetCloudflareAccountId()
    if (!accountId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "ACCOUNT_NOT_CONFIGURED",
            message: "Cloudflare account ID is not configured.",
          },
        },
        { status: 503 }
      )
    }

    const data = await ensureGatewayBlockPageConfigured(accountId)
    await createAdminClient().from("audit_log").insert({
      user_id: admin.id,
      action: "ADMIN_ENSURED_GATEWAY_BLOCK_PAGE",
      resource_type: "cloudflare",
      resource_id: "block-page",
    })
    return NextResponse.json({ success: true, data })
  } catch (error) {
    if (error instanceof AdminServiceError) {
      return NextResponse.json(
        {
          success: false,
          error: { code: error.code, message: error.message },
        },
        { status: error.status }
      )
    }
    console.error("POST /api/admin/cloudflare/block-page failed")
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "BLOCK_PAGE_FAILED",
          message: "Unable to apply Gateway block page settings.",
        },
      },
      { status: 500 }
    )
  }
}
