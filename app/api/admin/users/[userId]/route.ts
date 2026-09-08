import { NextResponse } from "next/server"

import { AdminServiceError } from "@/lib/services/admin/require-admin"
import { setAuthUserRole } from "@/lib/services/admin/users"
import { setAuthUserRoleSchema } from "@/schemas/admin/users"

type RouteContext = {
  params: Promise<{ userId: string }>
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { userId } = await context.params
    const body: unknown = await request.json()
    const parsed = setAuthUserRoleSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_BODY", message: "Invalid role payload" },
        },
        { status: 400 }
      )
    }

    const data = await setAuthUserRole(userId, parsed.data.role)
    return NextResponse.json({ success: true, data })
  } catch (error) {
    if (error instanceof AdminServiceError) {
      return NextResponse.json(
        {
          success: false,
          error: { code: error.code, message: error.message },
        },
        { status: error.status }
      )
    }
    console.error("PATCH /api/admin/users/[userId] failed")
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "UPDATE_ROLE_FAILED",
          message: "Unable to update user role.",
        },
      },
      { status: 500 }
    )
  }
}
