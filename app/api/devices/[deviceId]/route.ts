import { NextResponse } from "next/server"

import { DeviceServiceError } from "@/lib/services/devices/context"
import { removeConnectedDevice } from "@/lib/services/devices/remove-device"
import { renameConnectedDevice } from "@/lib/services/devices/rename-device"
import { renameDeviceSchema } from "@/schemas/devices/api"

interface DeviceRouteContext {
  params: Promise<{ deviceId: string }>
}

export async function PATCH(req: Request, context: DeviceRouteContext) {
  try {
    const { deviceId } = await context.params
    const body: unknown = await req.json()
    const parsed = renameDeviceSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      )
    }

    await renameConnectedDevice(deviceId, parsed.data)
    return NextResponse.json({ data: { id: deviceId, name: parsed.data.displayName } })
  } catch (error) {
    console.error("PATCH /api/devices/[deviceId]:", error)

    if (error instanceof DeviceServiceError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
      )
    }

    return NextResponse.json({ error: "Failed to rename device" }, { status: 500 })
  }
}

export async function DELETE(_req: Request, context: DeviceRouteContext) {
  try {
    const { deviceId } = await context.params
    await removeConnectedDevice(deviceId)
    return NextResponse.json({ data: { id: deviceId } })
  } catch (error) {
    console.error("DELETE /api/devices/[deviceId]:", error)

    if (error instanceof DeviceServiceError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
      )
    }

    return NextResponse.json({ error: "Failed to remove device" }, { status: 500 })
  }
}
