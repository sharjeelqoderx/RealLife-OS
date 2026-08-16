import { NextResponse } from "next/server"

import { getAdminCloudflareStatus } from "@/lib/services/admin/cloudflare-status"
import {
  AdminServiceError,
  requireAdminUser,
} from "@/lib/services/admin/require-admin"

export async function GET() {
  try {
    await requireAdminUser()
    const data = await getAdminCloudflareStatus()
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
    console.error("GET /api/admin/cloudflare/status failed")
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "ADMIN_STATUS_FAILED",
          message: "Unable to check Cloudflare status.",
        },
      },
      { status: 500 }
    )
  }
}
