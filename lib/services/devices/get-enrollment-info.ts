import { firstEnv } from "@/lib/services/devices/env"
import {
  getZeroTrustTeamName,
  WARP_MACOS_DOWNLOAD_URL,
  WARP_WINDOWS_DOWNLOAD_URL,
} from "@/lib/services/cloudflare/devices"
import { getDnsProfileSource } from "@/lib/services/content-policies/dns-profile"
import { listGatewayPolicies } from "@/lib/services/content-policies/gateway-policies"
import { getDeviceQuotaForUser } from "@/lib/services/devices/device-quota"
import {
  DeviceServiceError,
  getDeviceAccountContext,
  requireAuthenticatedUserId,
} from "@/lib/services/devices/context"
import { createClient } from "@/lib/supabase/server"
import type { DeviceEnrollmentInfo } from "@/schemas/devices/api"
import {
  APP_STORE_CLOUDFLARE_ONE,
  PLAY_STORE_CLOUDFLARE_ONE,
} from "@/schemas/devices/device"

/** Strip scheme/path and `.cloudflareaccess.com` → Cloudflare One team name. */
function normalizeZeroTrustTeamName(value: string): string {
  return value
    .trim()
    .replace(/^https?:\/\//i, "")
    .split("/")[0]
    .replace(/\.cloudflareaccess\.com$/i, "")
}

function getConfiguredTeamName(): string | null {
  const raw = firstEnv(
    "CLOUDFLARE_ZERO_TRUST_TEAM_NAME",
    "CLOUDFARE_ZERO_TRUST_TEAM_NAME",
    "CLOUDFLARE_ZERO_TRUST_TEAM_DOMAIN",
    "CLOUDFARE_ZERO_TRUST_TEAM_DOMAIN"
  )
  return raw ? normalizeZeroTrustTeamName(raw) : null
}

function getConfiguredTeamDomain(teamName: string | null): string | null {
  const raw = firstEnv(
    "CLOUDFLARE_ZERO_TRUST_TEAM_DOMAIN",
    "CLOUDFARE_ZERO_TRUST_TEAM_DOMAIN"
  )
  if (raw) {
    return `${normalizeZeroTrustTeamName(raw)}.cloudflareaccess.com`
  }
  return teamName ? `${teamName}.cloudflareaccess.com` : null
}

export async function getDeviceEnrollmentInfo(): Promise<DeviceEnrollmentInfo> {
  const userId = await requireAuthenticatedUserId()
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { accountId, tenantReady } = await getDeviceAccountContext(userId)

  // Prefer configured team name (shared Zero Trust) over API org lookup.
  let teamName = getConfiguredTeamName()

  if (!teamName && tenantReady && accountId) {
    const fromApi = await getZeroTrustTeamName(accountId)
    teamName = fromApi ? normalizeZeroTrustTeamName(fromApi) : null
  }

  const teamDomain = getConfiguredTeamDomain(teamName)

  const installEmails = [user?.email].filter(
    (email): email is string => Boolean(email)
  )

  let dnsProfileAvailable = false
  let dohSubdomain: string | null = null
  try {
    const dnsProfile = await getDnsProfileSource(userId)
    dnsProfileAvailable = dnsProfile.available
    dohSubdomain = dnsProfile.dohSubdomain
  } catch (error) {
    console.warn("getDeviceEnrollmentInfo: dns profile lookup failed:", error)
  }

  let gatewayPolicyCount = 0
  try {
    const policies = await listGatewayPolicies()
    gatewayPolicyCount = policies.length
  } catch (error) {
    console.warn("getDeviceEnrollmentInfo: gateway policies lookup failed:", error)
  }

  // Fail closed: quota errors must not advertise canAddDevice=true.
  let quota: Awaited<ReturnType<typeof getDeviceQuotaForUser>>
  try {
    quota = await getDeviceQuotaForUser(userId)
  } catch (error) {
    if (error instanceof DeviceServiceError) {
      throw error
    }
    throw new DeviceServiceError(
      "Unable to load device quota",
      503,
      "DEVICE_QUOTA_UNAVAILABLE"
    )
  }

  return {
    tenantReady,
    hasAccess: quota.hasAccess,
    teamName,
    teamDomain,
    installEmails,
    dnsProfileAvailable,
    dohSubdomain,
    gatewayPolicyCount,
    enrolledDeviceCount: quota.enrolledDeviceCount,
    deviceLimit: quota.deviceLimit,
    remainingDeviceSlots: quota.remainingDeviceSlots,
    canAddDevice: quota.canAddDevice,
    planName: quota.planName,
    limitSource: quota.limitSource,
    storeUrls: {
      android: PLAY_STORE_CLOUDFLARE_ONE,
      iphone: APP_STORE_CLOUDFLARE_ONE,
    },
    warpDownloadUrls: {
      macos: WARP_MACOS_DOWNLOAD_URL,
      windows: WARP_WINDOWS_DOWNLOAD_URL,
    },
  }
}
