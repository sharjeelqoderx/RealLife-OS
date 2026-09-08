import { createClient } from "@/lib/supabase/server"
import type {
  GatewayActivityListResponse,
  GatewayActivityLog,
} from "@/schemas/gateway-activity/activity-log"

export const GATEWAY_ACTIVITY_PAGE_SIZE = 50

export class GatewayActivityServiceError extends Error {
  readonly status: number
  readonly code: string

  constructor(message: string, status = 401, code = "UNAUTHORIZED") {
    super(message)
    this.name = "GatewayActivityServiceError"
    this.status = status
    this.code = code
  }
}

type ActivityRow = {
  id: string
  device_id: string | null
  device_name: string | null
  cloudflare_device_id: string
  dataset: string
  occurred_at: string
  hostname: string | null
  url: string | null
  action: string | null
  policy_id: string | null
  policy_name: string | null
  application_name: string | null
}

function toLog(row: ActivityRow): GatewayActivityLog {
  return {
    id: row.id,
    deviceId: row.device_id,
    deviceName: row.device_name,
    cloudflareDeviceId: row.cloudflare_device_id,
    dataset: row.dataset === "gateway_http" ? "gateway_http" : "gateway_dns",
    occurredAt: row.occurred_at,
    hostname: row.hostname,
    url: row.url,
    action: row.action,
    policyId: row.policy_id,
    policyName: row.policy_name,
    applicationName: row.application_name,
  }
}

export async function listGatewayActivityLogs(input?: {
  cursor?: string | null
  limit?: number
}): Promise<GatewayActivityListResponse> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new GatewayActivityServiceError("Unauthorized", 401, "UNAUTHORIZED")
  }

  const limit = Math.min(
    Math.max(input?.limit ?? GATEWAY_ACTIVITY_PAGE_SIZE, 1),
    100
  )
  const offset = input?.cursor ? Number.parseInt(input.cursor, 10) : 0
  if (!Number.isFinite(offset) || offset < 0) {
    throw new GatewayActivityServiceError(
      "Invalid pagination cursor",
      400,
      "INVALID_CURSOR"
    )
  }

  const { data, error } = await supabase
    .from("gateway_activity_logs")
    .select(
      "id, device_id, device_name, cloudflare_device_id, dataset, occurred_at, hostname, url, action, policy_id, policy_name, application_name"
    )
    .eq("user_id", user.id)
    .order("occurred_at", { ascending: false })
    .order("id", { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    throw new GatewayActivityServiceError(error.message, 500, "LIST_FAILED")
  }

  const rows = (data ?? []) as ActivityRow[]
  const hasMore = rows.length === limit

  return {
    logs: rows.map(toLog),
    nextCursor: hasMore ? String(offset + rows.length) : null,
  }
}
