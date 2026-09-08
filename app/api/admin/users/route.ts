import { NextResponse } from "next/server"

import {
  AdminServiceError,
  requireAdminUser,
} from "@/lib/services/admin/require-admin"
import { listAdminUsers } from "@/lib/services/admin/users"

export async function GET() {
  try {
    await requireAdminUser()
    const data = await listAdminUsers()
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
    console.error("GET /api/admin/users failed")
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "ADMIN_USERS_FAILED",
          message: "Unable to list users.",
        },
      },
      { status: 500 }
    )
  }
}
