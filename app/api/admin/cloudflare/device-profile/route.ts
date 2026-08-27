import { NextResponse } from "next/server"

import { tryGetCloudflareAccountId } from "@/lib/cloudflare/config"
import { ensureDefaultTrafficAndDnsProfile } from "@/lib/services/cloudflare/device-policy"
import {
  AdminServiceError,
  requireAdminUser,
} from "@/lib/services/admin/require-admin"
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

    const data = await ensureDefaultTrafficAndDnsProfile(accountId)
    await createAdminClient().from("audit_log").insert({
      user_id: admin.id,
      action: "ADMIN_ENSURED_TRAFFIC_AND_DNS_PROFILE",
      resource_type: "cloudflare",
      resource_id: "device-profile",
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
    console.error("POST /api/admin/cloudflare/device-profile failed")
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "DEVICE_PROFILE_FAILED",
          message: "Unable to apply Traffic and DNS device profile.",
        },
      },
      { status: 500 }
    )
  }
}
