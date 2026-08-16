import { NextResponse } from "next/server"

import { createLiveCloudflareProvider } from "@/lib/cloudflare/providers/live"
import {
  AdminServiceError,
  requireAdminUser,
} from "@/lib/services/admin/require-admin"

export async function GET() {
  try {
    await requireAdminUser()
    const devices = await createLiveCloudflareProvider().listPhysicalDevices()
    return NextResponse.json({
      success: true,
      data: {
        count: devices.length,
        devices: devices.map((device) => ({
          id: device.id,
          name: device.name ?? null,
          deviceType: device.device_type ?? null,
          activeRegistrations: device.active_registrations ?? 0,
          lastSeenAt: device.last_seen_at ?? device.last_seen ?? null,
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
    console.error("GET /api/admin/cloudflare/devices failed")
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "ADMIN_DEVICES_FAILED",
          message: "Unable to list Cloudflare devices.",
        },
      },
      { status: 500 }
    )
  }
}
