import { NextResponse } from "next/server"

import {
  createGatewayPolicy,
  listGatewayPolicies,
} from "@/lib/services/content-policies/gateway-policies"
import { createGatewayPolicySchema } from "@/schemas/content-policies/gateway-policy"

/**
 * List Gateway DNS policies for the current tenant / platform account.
 */
export async function GET() {
  try {
    const policies = await listGatewayPolicies()
    return NextResponse.json(policies)
  } catch (error) {
    console.error("GET /api/gateway-policies:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch gateway policies",
      },
      { status: 500 }
    )
  }
}

/**
 * Create a Gateway DNS policy from the shared editor UI
 * (categories, domains, apps, SafeSearch, YouTube Restricted, schedules, locations).
 */
export async function POST(req: Request) {
  try {
    const body: unknown = await req.json()
    const parsed = createGatewayPolicySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const rule = await createGatewayPolicy(parsed.data)
    return NextResponse.json({ data: rule }, { status: 201 })
  } catch (error) {
    console.error("POST /api/gateway-policies:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create gateway policy",
      },
      { status: 500 }
    )
  }
}
