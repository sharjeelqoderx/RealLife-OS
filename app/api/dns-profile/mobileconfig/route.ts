import { NextResponse } from "next/server"

import { getDnsProfileSource } from "@/lib/services/content-policies/dns-profile"
import { buildDohMobileconfig } from "@/lib/services/content-policies/policy-config-export"
import { createClient } from "@/lib/supabase/server"

/**
 * Download iOS/macOS DNS over HTTPS .mobileconfig.
 * Optional `?deviceId=` uses that device's Gateway DNS location DoH subdomain
 * so `dns.location` Gateway policies match (gateway_unique_id equivalent).
 *
 * @see https://developers.cloudflare.com/cloudflare-one/team-and-resources/devices/cloudflare-one-client/deployment/mdm-deployment/parameters/
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

    const deviceId = new URL(req.url).searchParams.get("deviceId")
    const source = await getDnsProfileSource(user.id, deviceId)

    if (!source.available || !source.dohSubdomain) {
      return NextResponse.json(
        {
          error: deviceId
            ? "No DNS location for this device. Re-enroll or wait for location provisioning."
            : "No shared Gateway DNS location found. Configure a DNS location in the platform Cloudflare Zero Trust account.",
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
