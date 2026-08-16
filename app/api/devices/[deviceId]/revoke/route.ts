import { NextResponse } from "next/server"

import { consumeRateLimit } from "@/lib/api/rate-limit"
import { DeviceServiceError } from "@/lib/services/devices/context"
import { revokeConnectedDevice } from "@/lib/services/devices/revoke-device"
import { createClient } from "@/lib/supabase/server"

interface RevokeDeviceContext {
  params: Promise<{ deviceId: string }>
}

export async function POST(
  _request: Request,
  context: RevokeDeviceContext
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const rateKey = `revoke:${user?.id ?? "anon"}`
    const rate = consumeRateLimit(rateKey, 10, 60_000)
    if (!rate.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "RATE_LIMITED",
            message: "Too many revoke attempts. Try again shortly.",
          },
        },
        {
          status: 429,
          headers: { "Retry-After": String(rate.retryAfterSeconds) },
        }
      )
    }

    const { deviceId } = await context.params
    await revokeConnectedDevice(deviceId)
    return NextResponse.json({ success: true, data: { id: deviceId } })
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
    console.error("POST /api/devices/[deviceId]/revoke failed")
    return NextResponse.json(
      {
        success: false,
        error: { code: "DEVICE_REVOKE_FAILED", message: "Unable to revoke device." },
      },
      { status: 500 }
    )
  }
}
