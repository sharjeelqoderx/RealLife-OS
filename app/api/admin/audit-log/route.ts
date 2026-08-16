import { NextResponse } from "next/server"

import { createAdminClient } from "@/lib/supabase/admin"
import {
  AdminServiceError,
  requireAdminUser,
} from "@/lib/services/admin/require-admin"

export async function GET() {
  try {
    await requireAdminUser()
    const { data, error } = await createAdminClient()
      .from("audit_log")
      .select("id, user_id, action, resource_type, resource_id, created_at")
      .order("created_at", { ascending: false })
      .limit(100)

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json({ success: true, data: data ?? [] })
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
    console.error("GET /api/admin/audit-log failed")
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "ADMIN_AUDIT_FAILED",
          message: "Unable to load audit log.",
        },
      },
      { status: 500 }
    )
  }
}
