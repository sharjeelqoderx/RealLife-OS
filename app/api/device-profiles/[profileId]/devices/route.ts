import { NextResponse } from "next/server"

import { addDeviceToProfile } from "@/lib/services/devices/device-profiles"
import { deviceProfileAddDeviceSchema } from "@/schemas/devices/profiles"

type RouteContext = { params: Promise<{ profileId: string }> }

export async function POST(req: Request, context: RouteContext) {
  try {
    const { profileId } = await context.params
    const body: unknown = await req.json()
    const parsed = deviceProfileAddDeviceSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      )
    }
    await addDeviceToProfile(profileId, parsed.data.deviceId)
    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (error) {
    console.error("POST /api/device-profiles/[profileId]/devices:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to add device to profile",
      },
      { status: 500 }
    )
  }
}
