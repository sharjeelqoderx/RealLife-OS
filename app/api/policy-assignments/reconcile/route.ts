import { NextResponse } from "next/server"

import { requireAuthenticatedUserId } from "@/lib/services/devices/context"
import { reconcilePolicyGatewayRules } from "@/lib/services/policy-assignments/sync-policy-enforcement"

export async function POST() {
  try {
    const userId = await requireAuthenticatedUserId()
    const result = await reconcilePolicyGatewayRules(userId)
    return NextResponse.json(result)
  } catch (error) {
    console.error("POST /api/policy-assignments/reconcile:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to reconcile Cloudflare rules",
      },
      { status: 500 }
    )
  }
}
