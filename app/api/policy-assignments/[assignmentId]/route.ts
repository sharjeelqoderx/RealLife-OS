import { NextResponse } from "next/server"

import { deletePolicyAssignment } from "@/lib/services/policy-assignments/policy-assignments"

type RouteContext = { params: Promise<{ assignmentId: string }> }

export async function DELETE(_req: Request, context: RouteContext) {
  try {
    const { assignmentId } = await context.params
    await deletePolicyAssignment(assignmentId)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("DELETE /api/policy-assignments/[assignmentId]:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete policy assignment",
      },
      { status: 500 }
    )
  }
}
