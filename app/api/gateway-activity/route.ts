import { NextResponse } from "next/server"

import {
  GatewayActivityServiceError,
  listGatewayActivityLogs,
} from "@/lib/services/gateway-activity/list-activity-logs"

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const cursor = url.searchParams.get("cursor")
    const limitParam = url.searchParams.get("limit")
    const limit = limitParam ? Number.parseInt(limitParam, 10) : undefined

    const data = await listGatewayActivityLogs({
      cursor,
      limit: Number.isFinite(limit) ? limit : undefined,
    })
    return NextResponse.json(data)
  } catch (error) {
    if (error instanceof GatewayActivityServiceError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
      )
    }
    console.error("GET /api/gateway-activity:", error)
    return NextResponse.json(
      { error: "Failed to list activity logs" },
      { status: 500 }
    )
  }
}
