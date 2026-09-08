import { NextResponse } from "next/server"

import { tryGetCloudflareAccountId } from "@/lib/cloudflare/config"
import { CloudflareApiError } from "@/lib/cloudflare/client"
import { tryGetCloudflareLogpushSecret } from "@/lib/env"
import {
  AdminServiceError,
  requireAdminUser,
} from "@/lib/services/admin/require-admin"
import {
  LogpushPermissionError,
  ensureGatewayLogpushJobs,
  listGatewayLogpushJobs,
} from "@/lib/services/cloudflare/logpush"
import { createAdminClient } from "@/lib/supabase/admin"

function logpushErrorResponse(error: unknown) {
  if (error instanceof AdminServiceError) {
    return NextResponse.json(
      {
        success: false,
        error: { code: error.code, message: error.message },
      },
      { status: error.status }
    )
  }
  if (error instanceof LogpushPermissionError) {
    return NextResponse.json(
      {
        success: false,
        error: { code: error.code, message: error.message },
      },
      { status: 403 }
    )
  }
  if (error instanceof CloudflareApiError) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "CLOUDFLARE_API_ERROR", message: error.message },
      },
      { status: error.status }
    )
  }
  console.error("admin cloudflare logpush failed")
  return NextResponse.json(
    {
      success: false,
      error: {
        code: "LOGPUSH_FAILED",
        message: "Unable to manage Logpush jobs.",
      },
    },
    { status: 500 }
  )
}

export async function GET() {
  try {
    await requireAdminUser()
    const jobs = await listGatewayLogpushJobs()
    return NextResponse.json({
      success: true,
      data: {
        jobs: jobs.map((job) => ({
          id: job.id ?? null,
          name: job.name ?? null,
          dataset: job.dataset ?? null,
          enabled: job.enabled ?? null,
          lastError: job.error_message ?? job.last_error_message ?? job.last_error ?? null,
        })),
        secretConfigured: Boolean(tryGetCloudflareLogpushSecret()),
      },
    })
  } catch (error) {
    return logpushErrorResponse(error)
  }
}

export async function POST() {
  try {
    const admin = await requireAdminUser()
    const accountId = tryGetCloudflareAccountId()
    if (!accountId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "ACCOUNT_NOT_CONFIGURED",
            message: "Cloudflare account ID is not configured.",
          },
        },
        { status: 503 }
      )
    }

    const data = await ensureGatewayLogpushJobs({ accountId })
    await createAdminClient().from("audit_log").insert({
      user_id: admin.id,
      action: "ADMIN_ENSURED_GATEWAY_LOGPUSH",
      resource_type: "cloudflare",
      resource_id: "logpush",
      metadata: {
        created: data.created,
        existing: data.existing,
        destinationHost: data.destinationHost,
      },
    })
    return NextResponse.json({
      success: true,
      data: {
        created: data.created,
        existing: data.existing,
        destinationHost: data.destinationHost,
        jobs: data.jobs.map((job) => ({
          id: job.id ?? null,
          name: job.name ?? null,
          dataset: job.dataset ?? null,
          enabled: job.enabled ?? null,
        })),
      },
    })
  } catch (error) {
    return logpushErrorResponse(error)
  }
}
