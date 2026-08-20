import { NextResponse } from "next/server"

import { requireAuthenticatedUserId } from "@/lib/services/devices/context"
import { resolveEffectivePolicy } from "@/lib/services/policy-assignments/resolve-effective-policy"

type RouteContext = { params: Promise<{ deviceId: string }> }

export async function GET(_req: Request, context: RouteContext) {
  try {
    const userId = await requireAuthenticatedUserId()
    const { deviceId } = await context.params
    const result = await resolveEffectivePolicy(userId, deviceId)
    return NextResponse.json(result)
  } catch (error) {
    console.error("GET /api/devices/[deviceId]/effective-policy:", error)
    const message =
      error instanceof Error ? error.message : "Failed to resolve policy"
    const status = message === "Device not found" ? 404 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
