import { cloudflareRequest } from "@/lib/cloudflare/client"
import { getCloudflareGatewayAuth } from "@/lib/cloudflare/config"

/**
 * Default Cloudflare One device settings profile.
 * @see https://developers.cloudflare.com/api/resources/zero_trust/subresources/devices/subresources/policies/subresources/default/methods/get/
 * @see https://developers.cloudflare.com/cloudflare-one/team-and-resources/devices/cloudflare-one-client/configure/modes/
 */

export type CloudflareDeviceServiceMode = {
  mode?: string
  port?: number
}

export type CloudflareDefaultDevicePolicy = {
  service_mode_v2?: CloudflareDeviceServiceMode
  disable_auto_fallback?: boolean
  allow_mode_switch?: boolean
  switch_locked?: boolean
  allowed_to_leave?: boolean
  auto_connect?: number
  gateway?: boolean
  enabled?: boolean
  name?: string
}

export type TrafficAndDnsProfileStatus = {
  trafficAndDns: boolean
  serviceMode: string | null
  disableAutoFallback: boolean | null
  allowModeSwitch: boolean | null
  switchLocked: boolean | null
  allowedToLeave: boolean | null
}

function isTrafficAndDnsMode(mode: string | undefined): boolean {
  const normalized = (mode ?? "").trim().toLowerCase()
  return normalized === "warp" || normalized === "warpwithdnsoverhttps"
}

export async function getDefaultDevicePolicy(
  accountId: string
): Promise<CloudflareDefaultDevicePolicy> {
  return cloudflareRequest<CloudflareDefaultDevicePolicy>({
    method: "GET",
    path: `/accounts/${accountId}/devices/policy`,
    auth: getCloudflareGatewayAuth(),
  })
}

export function readTrafficAndDnsProfileStatus(
  policy: CloudflareDefaultDevicePolicy | null | undefined
): TrafficAndDnsProfileStatus {
  const mode = policy?.service_mode_v2?.mode ?? null
  return {
    trafficAndDns: isTrafficAndDnsMode(mode ?? undefined),
    serviceMode: mode,
    disableAutoFallback: policy?.disable_auto_fallback ?? null,
    allowModeSwitch: policy?.allow_mode_switch ?? null,
    switchLocked: policy?.switch_locked ?? null,
    allowedToLeave: policy?.allowed_to_leave ?? null,
  }
}

/**
 * Apply Traffic and DNS mode on the default device profile.
 * Does not silently enable switch lock / leave-org lock (MDM-sensitive).
 *
 * @see https://developers.cloudflare.com/learning-paths/replace-vpn/configure-device-agent/device-profiles/
 */
export async function ensureDefaultTrafficAndDnsProfile(
  accountId: string
): Promise<TrafficAndDnsProfileStatus> {
  const current = await getDefaultDevicePolicy(accountId)
  const status = readTrafficAndDnsProfileStatus(current)
  if (status.trafficAndDns && status.disableAutoFallback === true) {
    return status
  }

  await cloudflareRequest<CloudflareDefaultDevicePolicy>({
    method: "PATCH",
    path: `/accounts/${accountId}/devices/policy`,
    auth: getCloudflareGatewayAuth(),
    body: {
      service_mode_v2: { mode: "warp" },
      disable_auto_fallback: true,
      allow_mode_switch: false,
    },
  })

  const updated = await getDefaultDevicePolicy(accountId)
  return readTrafficAndDnsProfileStatus(updated)
}
