import { NextResponse } from "next/server"

import { removeDeviceFromProfile } from "@/lib/services/devices/device-profiles"

type RouteContext = {
  params: Promise<{ profileId: string; deviceId: string }>
}

export async function DELETE(_req: Request, context: RouteContext) {
  try {
    const { profileId, deviceId } = await context.params
    await removeDeviceFromProfile(profileId, deviceId)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error(
      "DELETE /api/device-profiles/[profileId]/devices/[deviceId]:",
      error
    )
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to remove device from profile",
      },
      { status: 500 }
    )
  }
}
