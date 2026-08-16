import { NextResponse } from "next/server"

import {
  deleteGatewayPolicy,
  getGatewayPolicyForEditor,
  updateGatewayPolicy,
} from "@/lib/services/content-policies/gateway-policies"
import { createGatewayPolicySchema } from "@/schemas/content-policies/gateway-policy"

type RouteContext = {
  params: Promise<{ policyId: string }>
}

/**
 * Load a Gateway policy as editor-ready form state (traffic/schedule parsed).
 */
export async function GET(_req: Request, context: RouteContext) {
  try {
    const { policyId } = await context.params
    const data = await getGatewayPolicyForEditor(policyId)
    if (!data) {
      return NextResponse.json({ error: "Policy not found" }, { status: 404 })
    }
    return NextResponse.json({ data })
  } catch (error) {
    console.error("GET /api/gateway-policies/[policyId]:", error)
    const message =
      error instanceof Error ? error.message : "Failed to load policy"
    const status = /unauthorized/i.test(message) ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

/**
 * Update a Gateway DNS policy from the shared editor UI.
 */
export async function PUT(req: Request, context: RouteContext) {
  try {
    const { policyId } = await context.params
    const body: unknown = await req.json()
    const parsed = createGatewayPolicySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const rule = await updateGatewayPolicy(policyId, parsed.data)
    return NextResponse.json({ data: rule })
  } catch (error) {
    console.error("PUT /api/gateway-policies/[policyId]:", error)
    const message =
      error instanceof Error ? error.message : "Failed to update policy"
    const status = /unauthorized/i.test(message)
      ? 401
      : /not found|could not find/i.test(message)
        ? 404
        : 500
    return NextResponse.json({ error: message }, { status })
  }
}

/**
 * Delete an owned Gateway DNS policy on the shared Zero Trust account.
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
