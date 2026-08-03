import { NextResponse } from "next/server"

import { deleteGatewayPolicy } from "@/lib/services/content-policies/gateway-policies"

type RouteContext = {
  params: Promise<{ policyId: string }>
}

/**
 * Delete a Gateway DNS policy (Access fallback when applicable).
 */
export async function DELETE(_req: Request, context: RouteContext) {
  try {
    const { policyId } = await context.params
    await deleteGatewayPolicy(policyId)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("DELETE /api/gateway-policies/[policyId]:", error)
    const message =
      error instanceof Error ? error.message : "Failed to delete policy"
    const status = /unauthorized/i.test(message)
      ? 401
      : /not found|could not find/i.test(message)
        ? 404
        : 500
    return NextResponse.json({ error: message }, { status })
  }
}
