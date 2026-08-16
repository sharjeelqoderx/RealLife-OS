import { NextResponse } from "next/server"

import { createLiveCloudflareProvider } from "@/lib/cloudflare/providers/live"
import {
  AdminServiceError,
  requireAdminUser,
} from "@/lib/services/admin/require-admin"

export async function GET() {
  try {
    await requireAdminUser()
    const rules = await createLiveCloudflareProvider().listGatewayRules()
    return NextResponse.json({
      success: true,
      data: {
        count: rules.length,
        rules: rules.map((rule) => ({
          id: rule.id ?? null,
          name: rule.name ?? null,
          action: rule.action ?? null,
          enabled: rule.enabled ?? null,
          precedence: rule.precedence ?? null,
        })),
      },
    })
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
    console.error("GET /api/admin/cloudflare/gateway-rules failed")
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "ADMIN_GATEWAY_RULES_FAILED",
          message: "Unable to list Gateway rules.",
        },
      },
      { status: 500 }
    )
  }
}
