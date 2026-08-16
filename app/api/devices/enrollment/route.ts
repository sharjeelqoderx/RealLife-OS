import { NextResponse } from "next/server"

import { consumeRateLimit } from "@/lib/api/rate-limit"
import { DeviceServiceError } from "@/lib/services/devices/context"
import { createDeviceEnrollment } from "@/lib/services/devices/enrollments"
import { createClient } from "@/lib/supabase/server"
import { createDeviceEnrollmentSchema } from "@/schemas/devices/api"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "UNAUTHORIZED", message: "Unauthorized" },
        },
        { status: 401 }
      )
    }

    const rateKey = `enrollment:${user.id}`
    const rate = consumeRateLimit(rateKey, 5, 60_000)
    if (!rate.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "RATE_LIMITED",
            message: "Too many enrollment attempts. Try again shortly.",
          },
        },
        {
          status: 429,
          headers: { "Retry-After": String(rate.retryAfterSeconds) },
        }
      )
    }

    const parsed = createDeviceEnrollmentSchema.safeParse(
      (await request.json()) as unknown
    )
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_REQUEST",
            message: "A valid device name is required.",
          },
        },
        { status: 400 }
      )
    }

    const data = await createDeviceEnrollment(parsed.data)
    return NextResponse.json({ success: true, data }, { status: 201 })
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
    console.error("POST /api/devices/enrollment failed")
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "ENROLLMENT_CREATE_FAILED",
          message: "Unable to start device enrollment.",
        },
      },
      { status: 500 }
    )
  }
}
