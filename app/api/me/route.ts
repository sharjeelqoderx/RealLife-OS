import { NextResponse } from "next/server"

import { getDeviceQuotaForUser } from "@/lib/services/devices/device-quota"
import {
  DeviceServiceError,
  requireAuthenticatedUserId,
} from "@/lib/services/devices/context"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const userId = await requireAuthenticatedUserId()
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const quota = await getDeviceQuotaForUser(userId)

    return NextResponse.json({
      success: true,
      data: {
        id: userId,
        email: user?.email ?? null,
        subscriptionPlan: quota.planName,
        deviceLimit: quota.deviceLimit,
        enrolledDeviceCount: quota.enrolledDeviceCount,
        remainingDeviceSlots: quota.remainingDeviceSlots,
        hasAccess: quota.hasAccess,
        limitSource: quota.limitSource,
      },
    })
  } catch (error) {
    if (error instanceof DeviceServiceError) {
      return NextResponse.json(
        {
          success: false,
          error: { code: error.code, message: error.message },
        },
        { status: error.status }
      )
    }
    console.error("GET /api/me failed")
    return NextResponse.json(
      {
        success: false,
        error: { code: "ME_FAILED", message: "Unable to load account." },
      },
      { status: 500 }
    )
  }
}
