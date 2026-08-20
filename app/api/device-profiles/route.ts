import { NextResponse } from "next/server"

import {
  createDeviceProfile,
  listDeviceProfiles,
} from "@/lib/services/devices/device-profiles"
import { deviceProfileCreateSchema } from "@/schemas/devices/profiles"

export async function GET() {
  try {
    const profiles = await listDeviceProfiles()
    return NextResponse.json(profiles)
  } catch (error) {
    console.error("GET /api/device-profiles:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to list profiles",
      },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json()
    const parsed = deviceProfileCreateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      )
    }
    const profile = await createDeviceProfile(parsed.data)
    return NextResponse.json({ data: profile }, { status: 201 })
  } catch (error) {
    console.error("POST /api/device-profiles:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create profile",
      },
      { status: 500 }
    )
  }
}
