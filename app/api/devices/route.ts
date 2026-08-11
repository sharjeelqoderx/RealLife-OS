import { NextResponse } from "next/server"

import { DeviceServiceError } from "@/lib/services/devices/context"
import { listConnectedDevices } from "@/lib/services/devices/list-connected-devices"

export async function GET() {
  try {
    const devices = await listConnectedDevices()
    return NextResponse.json(devices)
  } catch (error) {
    console.error("GET /api/devices:", error)

    if (error instanceof DeviceServiceError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
      )
    }

    return NextResponse.json(
      { error: "Failed to fetch connected devices" },
      { status: 500 }
    )
  }
}
