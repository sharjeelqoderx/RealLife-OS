import { NextResponse } from "next/server"

import {
  deleteDeviceProfile,
  updateDeviceProfile,
} from "@/lib/services/devices/device-profiles"
import { deviceProfileUpdateSchema } from "@/schemas/devices/profiles"

type RouteContext = { params: Promise<{ profileId: string }> }

export async function PATCH(req: Request, context: RouteContext) {
  try {
    const { profileId } = await context.params
    const body: unknown = await req.json()
    const parsed = deviceProfileUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      )
    }
    const profile = await updateDeviceProfile(profileId, parsed.data)
    return NextResponse.json({ data: profile })
  } catch (error) {
    console.error("PATCH /api/device-profiles/[profileId]:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update profile",
      },
      { status: 500 }
    )
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  try {
    const { profileId } = await context.params
    await deleteDeviceProfile(profileId)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("DELETE /api/device-profiles/[profileId]:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to delete profile",
      },
      { status: 500 }
    )
  }
}
