import { NextResponse } from "next/server"

import { getDnsProfileSource } from "@/lib/services/content-policies/dns-profile"
import { buildDohMobileconfig } from "@/lib/services/content-policies/policy-config-export"
import { createClient } from "@/lib/supabase/server"

/**
 * Download iOS/macOS DNS over HTTPS .mobileconfig for the account's Gateway location.
 * Cloudflare has no policy "download config" URL — this is generated from location DoH subdomain.
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

    const source = await getDnsProfileSource(user.id)

    if (!source.available || !source.dohSubdomain) {
      return NextResponse.json(
        {
          error:
            "No Gateway DNS location found. Provision a tenant or create a DNS location in Cloudflare Zero Trust first.",
        },
        { status: 404 }
      )
    }

    const xml = buildDohMobileconfig({
      displayName: source.displayName,
      dohSubdomain: source.dohSubdomain,
      ipv4Addresses: source.ipv4Addresses,
    })

    const filename = `${source.dohSubdomain}-dns.mobileconfig`

    return new NextResponse(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/x-apple-aspen-config",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    console.error("GET /api/dns-profile/mobileconfig:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate DNS profile",
      },
      { status: 500 }
    )
  }
}
