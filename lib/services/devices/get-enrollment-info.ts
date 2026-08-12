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
  slugifyTeamNameFallback,
} from "@/lib/services/devices/context"
import { getTenantCloudflareAccountForUser } from "@/lib/services/tenants/provision"
import { createClient } from "@/lib/supabase/server"
import type { DeviceEnrollmentInfo } from "@/schemas/devices/api"
import {
  APP_STORE_CLOUDFLARE_ONE,
  PLAY_STORE_CLOUDFLARE_ONE,
} from "@/schemas/devices/device"

export async function getDeviceEnrollmentInfo(): Promise<DeviceEnrollmentInfo> {
  const userId = await requireAuthenticatedUserId()
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const tenant = await getTenantCloudflareAccountForUser(userId)
  const { tenantReady } = await getDeviceAccountContext(userId)

  let teamName: string | null = null
  if (tenant?.cloudflareAccountId && tenant.cloudflareAccountId !== "pending") {
    teamName = await getZeroTrustTeamName(tenant.cloudflareAccountId)
  }

  if (!teamName) {
    teamName =
      firstEnv("CLOUDFLARE_ZERO_TRUST_TEAM_NAME", "CLOUDFARE_ZERO_TRUST_TEAM_NAME") ??
      (tenant?.cloudflareAccountName
        ? slugifyTeamNameFallback(tenant.cloudflareAccountName)
        : null)
  }

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
    teamName,
    installEmails,
    dnsProfileAvailable,
    dohSubdomain,
    gatewayPolicyCount,
    enrolledDeviceCount: quota.enrolledDeviceCount,
    deviceLimit: quota.deviceLimit,
    remainingDeviceSlots: quota.remainingDeviceSlots,
    canAddDevice: quota.canAddDevice && tenantReady,
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
