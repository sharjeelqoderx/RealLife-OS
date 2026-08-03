import { NextResponse } from "next/server"

import {
  getTenantCloudflareAccountForUser,
  provisionTenantCloudflareAccount,
  TenantProvisionError,
} from "@/lib/services/tenants/provision"
import { createClient } from "@/lib/supabase/server"
import { provisionTenantSchema } from "@/schemas/tenants/provision"

/**
 * Return the current user's Cloudflare tenant mapping (if provisioned).
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const tenant = await getTenantCloudflareAccountForUser(user.id)
    return NextResponse.json(tenant)
  } catch (error) {
    console.error("GET /api/tenants/provision:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load tenant provisioning status",
      },
      { status: 500 }
    )
  }
}

/**
 * Phase 1 §3.6 — Provision Cloudflare child account + Gateway + DNS location
 * for the authenticated household.
 *
 * Orchestrates:
 * POST /accounts (Create Account)
 * → POST /accounts/{id}/gateway
 * → POST /accounts/{id}/gateway/locations (DoH/DoT)
 * → baseline Gateway DNS rules
 * → persist tenant_cloudflare_accounts
 */
export async function POST(req: Request) {
  try {
    const body: unknown = await req.json()
    const parsed = provisionTenantSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const tenant = await provisionTenantCloudflareAccount(parsed.data)
    return NextResponse.json({ data: tenant }, { status: 201 })
  } catch (error) {
    console.error("POST /api/tenants/provision:", error)

    if (error instanceof TenantProvisionError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
      )
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to provision tenant",
      },
      { status: 500 }
    )
  }
}
