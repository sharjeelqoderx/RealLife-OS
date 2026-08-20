import { NextResponse } from "next/server"

import {
  createPolicyAssignment,
  listPolicyAssignments,
} from "@/lib/services/policy-assignments/policy-assignments"
import { policyAssignmentCreateSchema } from "@/schemas/devices/profiles"

export async function GET() {
  try {
    const assignments = await listPolicyAssignments()
    return NextResponse.json(assignments)
  } catch (error) {
    console.error("GET /api/policy-assignments:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to list policy assignments",
      },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json()
    const parsed = policyAssignmentCreateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      )
    }
    const assignment = await createPolicyAssignment(parsed.data)
    return NextResponse.json({ data: assignment }, { status: 201 })
  } catch (error) {
    console.error("POST /api/policy-assignments:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create policy assignment",
      },
      { status: 500 }
    )
  }
}
