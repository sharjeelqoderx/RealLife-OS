import { NextResponse } from "next/server"

import { createLiveCloudflareProvider } from "@/lib/cloudflare/providers/live"
import {
  AdminServiceError,
  requireAdminUser,
} from "@/lib/services/admin/require-admin"

export async function GET() {
  try {
    await requireAdminUser()
    const registrations =
      await createLiveCloudflareProvider().listRegistrations()
    return NextResponse.json({
      success: true,
      data: {
        count: registrations.length,
        registrations: registrations.map((registration) => ({
          id: registration.id,
          deviceId: registration.device?.id ?? null,
          email: registration.user?.email ?? null,
          lastSeen: registration.last_seen_at ?? null,
          revokedAt: registration.revoked_at ?? null,
        })),
      },
    })
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
    console.error("GET /api/admin/cloudflare/registrations failed")
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "ADMIN_REGISTRATIONS_FAILED",
          message: "Unable to list Cloudflare registrations.",
        },
      },
      { status: 500 }
    )
  }
}
