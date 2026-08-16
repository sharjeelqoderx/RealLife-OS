import { NextResponse } from "next/server"

import { createAdminClient } from "@/lib/supabase/admin"
import {
  AdminServiceError,
  requireAdminUser,
} from "@/lib/services/admin/require-admin"
import { syncCloudflareDevices } from "@/lib/services/cloudflare/sync-devices"

export async function POST() {
  try {
    const admin = await requireAdminUser()
    const data = await syncCloudflareDevices()
    await createAdminClient().from("audit_log").insert({
      user_id: admin.id,
      action: "ADMIN_SYNCED_CLOUDFLARE",
      resource_type: "cloudflare",
      resource_id: "devices",
      metadata: data,
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
    console.error("POST /api/admin/cloudflare/sync failed")
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "ADMIN_SYNC_FAILED",
          message: "Unable to synchronize Cloudflare devices.",
        },
      },
      { status: 500 }
    )
  }
}
