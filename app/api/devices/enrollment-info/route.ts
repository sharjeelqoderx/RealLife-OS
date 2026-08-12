import { NextResponse } from "next/server"

import { DeviceServiceError } from "@/lib/services/devices/context"
import { getDeviceEnrollmentInfo } from "@/lib/services/devices/get-enrollment-info"

export async function GET() {
  try {
    const info = await getDeviceEnrollmentInfo()
    return NextResponse.json(info)
  } catch (error) {
    console.error("GET /api/devices/enrollment-info:", error)

    if (error instanceof DeviceServiceError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
      )
    }

    return NextResponse.json(
      { error: "Failed to fetch device enrollment info" },
      { status: 500 }
    )
  }
}
