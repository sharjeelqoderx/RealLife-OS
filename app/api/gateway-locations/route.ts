import { NextResponse } from "next/server"

import { listGatewayAudiencePickerGroups } from "@/lib/services/cloudflare/audience-picker"
import { createGatewayLocation } from "@/lib/services/cloudflare/locations"
import { getPolicyCloudflareAccountId } from "@/lib/services/content-policies/gateway-policies"
import { createClient } from "@/lib/supabase/server"
import { createGatewayLocationSchema } from "@/schemas/content-policies/gateway-location"

/**
 * List Gateway DNS locations as Audience picker groups (per-device scope).
 * Optional `?q=` filters by name, DoH subdomain, or IPv4.
 */
export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const q = searchParams.get("q")?.trim() || undefined

    const accountId = await getPolicyCloudflareAccountId(user.id)
    const groups = await listGatewayAudiencePickerGroups(accountId, q)
    return NextResponse.json({ groups })
  } catch (error) {
    console.error("GET /api/gateway-locations:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch gateway locations",
      },
      { status: 500 }
    )
  }
}

/**
 * Create a Gateway DNS location (DoH/DoT enabled) for Audience picker.
 */
export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const json: unknown = await req.json()
    const parsed = createGatewayLocationSchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid body" },
        { status: 400 }
      )
    }

    const accountId = await getPolicyCloudflareAccountId(user.id)
    // Never let customers flip the shared-account default DNS location.
    const location = await createGatewayLocation(accountId, {
      name: parsed.data.name,
      clientDefault: false,
      enableDoh: true,
      enableDot: true,
      // DoH/DoT only — shared IPv4 needs a source network we do not collect here.
      enableIpv4: false,
    })

    if (!location.id) {
      return NextResponse.json(
        { error: "Location created but no id returned" },
        { status: 502 }
      )
    }

    return NextResponse.json({ data: location }, { status: 201 })
  } catch (error) {
    console.error("POST /api/gateway-locations:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create gateway location",
      },
      { status: 500 }
    )
  }
}
