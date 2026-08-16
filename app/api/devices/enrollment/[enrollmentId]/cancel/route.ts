import { NextResponse } from "next/server"

import { DeviceServiceError } from "@/lib/services/devices/context"
import { cancelDeviceEnrollment } from "@/lib/services/devices/enrollments"

interface CancelEnrollmentContext {
  params: Promise<{ enrollmentId: string }>
}

export async function POST(
  _request: Request,
  context: CancelEnrollmentContext
) {
  try {
    const { enrollmentId } = await context.params
    await cancelDeviceEnrollment(enrollmentId)
    return NextResponse.json({ success: true, data: { status: "cancelled" } })
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
    console.error("POST /api/devices/enrollment/[enrollmentId]/cancel failed")
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "ENROLLMENT_CANCEL_FAILED",
          message: "Unable to cancel device enrollment.",
        },
      },
      { status: 500 }
    )
  }
}
