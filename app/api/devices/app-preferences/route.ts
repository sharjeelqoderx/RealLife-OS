import { NextResponse } from "next/server"

import { DeviceServiceError } from "@/lib/services/devices/context"
import {
  getDeviceAppPreferences,
  updateDeviceAppPreferences,
} from "@/lib/services/devices/app-preferences"
import { updateDeviceAppPreferencesSchema } from "@/schemas/devices/api"

export async function GET() {
  try {
    const preferences = await getDeviceAppPreferences()
    return NextResponse.json(preferences)
  } catch (error) {
    console.error("GET /api/devices/app-preferences:", error)

    if (error instanceof DeviceServiceError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
      )
    }

    return NextResponse.json(
      { error: "Failed to fetch device app preferences" },
      { status: 500 }
    )
  }
}

export async function PATCH(req: Request) {
  try {
    const body: unknown = await req.json()
    const parsed = updateDeviceAppPreferencesSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const preferences = await updateDeviceAppPreferences(parsed.data)
    return NextResponse.json(preferences)
  } catch (error) {
    console.error("PATCH /api/devices/app-preferences:", error)

    if (error instanceof DeviceServiceError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
      )
    }

    return NextResponse.json(
      { error: "Failed to save device app preferences" },
      { status: 500 }
    )
  }
}
