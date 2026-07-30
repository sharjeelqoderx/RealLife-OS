import { NextResponse } from "next/server"

import {
  createAccessPolicy,
  listAccessPolicies,
} from "@/lib/services/content-policies/access-policies"
import { createAccessPolicySchema } from "@/schemas/content-policies/access-policy"

export async function GET() {
  try {
    const policies = await listAccessPolicies()
    return NextResponse.json(policies)
  } catch (error) {
    console.error("GET /api/access-policies:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch access policies",
      },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json()
    const parsed = createAccessPolicySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const policy = await createAccessPolicy(parsed.data)
    return NextResponse.json({ data: policy }, { status: 201 })
  } catch (error) {
    console.error("POST /api/access-policies:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create access policy",
      },
      { status: 500 }
    )
  }
}
