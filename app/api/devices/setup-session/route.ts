import { NextResponse } from "next/server"

import { DeviceServiceError } from "@/lib/services/devices/context"
import {
  getDeviceSetupSession,
  updateDeviceSetupSession,
} from "@/lib/services/devices/setup-session"
import { updateDeviceSetupSessionSchema } from "@/schemas/devices/api"
import { devicePlatformSchema } from "@/schemas/devices/device"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const platformParam = searchParams.get("platform") ?? "android"
    const parsedPlatform = devicePlatformSchema.safeParse(platformParam)
    const platform = parsedPlatform.success ? parsedPlatform.data : "android"

    const session = await getDeviceSetupSession(platform)
    return NextResponse.json(session)
  } catch (error) {
    console.error("GET /api/devices/setup-session:", error)

    if (error instanceof DeviceServiceError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
      )
    }

    return NextResponse.json(
      { error: "Failed to fetch device setup session" },
      { status: 500 }
    )
  }
}

export async function PATCH(req: Request) {
  try {
    const body: unknown = await req.json()
    const parsed = updateDeviceSetupSessionSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const session = await updateDeviceSetupSession(parsed.data)
    return NextResponse.json(session)
  } catch (error) {
    console.error("PATCH /api/devices/setup-session:", error)

    if (error instanceof DeviceServiceError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
      )
    }

    return NextResponse.json(
      { error: "Failed to save device setup session" },
      { status: 500 }
    )
  }
}
