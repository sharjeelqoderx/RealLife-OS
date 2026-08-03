import { NextResponse } from "next/server"

import {
  createCloudflareAccount,
  listCloudflareAccounts,
} from "@/lib/services/cloudflare/accounts"
import { createClient } from "@/lib/supabase/server"
import { createCloudflareAccountSchema } from "@/schemas/cloudflare/account"

async function requireAuthenticatedUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

/**
 * List Cloudflare accounts visible to the Tenant admin.
 * Phase 1 admin / ops tooling.
 */
export async function GET() {
  try {
    const user = await requireAuthenticatedUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const accounts = await listCloudflareAccounts()
    return NextResponse.json(accounts)
  } catch (error) {
    console.error("GET /api/cloudflare/accounts:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to list Cloudflare accounts",
      },
      { status: 500 }
    )
  }
}

/**
 * Create a Cloudflare child account (Tenant admin API).
 * @see https://developers.cloudflare.com/api/resources/accounts/methods/create
 *
 * Prefer POST /api/tenants/provision for full Phase 1 onboarding
 * (account + Gateway + location + baseline policies + DB mapping).
 */
export async function POST(req: Request) {
  try {
    const user = await requireAuthenticatedUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body: unknown = await req.json()
    const parsed = createCloudflareAccountSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const account = await createCloudflareAccount(parsed.data)
    return NextResponse.json({ data: account }, { status: 201 })
  } catch (error) {
    console.error("POST /api/cloudflare/accounts:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create Cloudflare account",
      },
      { status: 500 }
    )
  }
}
