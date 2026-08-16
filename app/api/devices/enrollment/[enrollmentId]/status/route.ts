import { NextResponse } from "next/server"

import { consumeRateLimit } from "@/lib/api/rate-limit"
import { DeviceServiceError } from "@/lib/services/devices/context"
import { getDeviceEnrollmentStatus } from "@/lib/services/devices/enrollments"
import { createClient } from "@/lib/supabase/server"

interface EnrollmentStatusContext {
  params: Promise<{ enrollmentId: string }>
}

export async function GET(
  _request: Request,
  context: EnrollmentStatusContext
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
        { status: 401 }
      )
    }

    const { enrollmentId } = await context.params
    const rate = consumeRateLimit(
      `enrollment-status:${user.id}:${enrollmentId}`,
      30,
      60_000
    )
    if (!rate.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "RATE_LIMITED",
            message: "Too many enrollment status checks. Try again shortly.",
          },
        },
        {
          status: 429,
          headers: { "Retry-After": String(rate.retryAfterSeconds) },
        }
      )
    }

    const data = await getDeviceEnrollmentStatus(enrollmentId)
    return NextResponse.json({ success: true, data })
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
    console.error("GET /api/devices/enrollment/[enrollmentId]/status failed")
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "ENROLLMENT_STATUS_FAILED",
          message: "Unable to check device enrollment.",
        },
      },
      { status: 500 }
    )
  }
}
