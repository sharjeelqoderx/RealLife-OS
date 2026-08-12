import { cloudflareRequest } from "@/lib/cloudflare/client"
import { getCloudflareGatewayAuth } from "@/lib/cloudflare/config"

export type CloudflarePhysicalDevice = {
  id: string
  name?: string
  device_type?: string
  model?: string
  manufacturer?: string
  os_version?: string
  active_registrations?: number
  /** @deprecated Prefer last_seen_at (current CF API). */
  last_seen?: string
  last_seen_at?: string
  last_seen_user?: {
    id?: string
    email?: string
    name?: string
  }
  last_seen_registration?: {
    id?: string
    last_seen?: string
    last_seen_user?: {
      id?: string
      email?: string
      name?: string
    }
    policy?: {
      id?: string
      name?: string
      default?: boolean
    }
  }
}

type PhysicalDevicesPage = CloudflarePhysicalDevice[]

/**
 * List WARP physical devices for a Zero Trust account.
 * @see https://developers.cloudflare.com/api/resources/zero_trust/subresources/devices/subresources/devices/methods/list/
 */
export async function listPhysicalDevices(
  accountId: string
): Promise<CloudflarePhysicalDevice[]> {
  const result = await cloudflareRequest<PhysicalDevicesPage>({
    method: "GET",
    path: `/accounts/${accountId}/devices/physical-devices`,
    auth: getCloudflareGatewayAuth(),
    searchParams: {
      per_page: 50,
      active_registrations: "include",
      include: "last_seen_registration.policy",
      sort_by: "last_seen_at",
      sort_order: "desc",
    },
  })

  return result ?? []
}

/**
 * Revoke all WARP registrations for a physical device.
 * @see https://developers.cloudflare.com/api/resources/zero_trust/subresources/devices/subresources/devices/methods/revoke/
 */
export async function revokePhysicalDevice(
  accountId: string,
  deviceId: string
): Promise<void> {
  await cloudflareRequest<unknown>({
    method: "POST",
    path: `/accounts/${accountId}/devices/physical-devices/${deviceId}/revoke`,
    auth: getCloudflareGatewayAuth(),
  })
}

/**
 * Revoke WARP device registrations by registration ID list.
 * Prefer {@link revokePhysicalDevice} when only the device id is known.
 * @see https://developers.cloudflare.com/api/resources/zero_trust/subresources/devices/subresources/registrations/methods/revoke/
 */
export async function revokeDeviceRegistrations(
  accountId: string,
  registrationIds: string[]
): Promise<void> {
  if (registrationIds.length === 0) {
    return
  }

  await cloudflareRequest<unknown>({
    method: "POST",
    path: `/accounts/${accountId}/devices/registrations/revoke`,
    auth: getCloudflareGatewayAuth(),
    body: { registration_ids: registrationIds },
  })
}

type AccessOrganization = {
  auth_domain?: string
  name?: string
}

/**
 * Zero Trust team name shown in Cloudflare One app enrollment.
 */
export async function getZeroTrustTeamName(
  accountId: string
): Promise<string | null> {
  try {
    const orgs = await cloudflareRequest<AccessOrganization[]>({
      method: "GET",
      path: `/accounts/${accountId}/access/organizations`,
      auth: getCloudflareGatewayAuth(),
    })

    const authDomain = orgs?.[0]?.auth_domain
    if (authDomain) {
      return authDomain.replace(/\.cloudflareaccess\.com$/i, "")
    }
  } catch (error) {
    console.warn("getZeroTrustTeamName: organizations lookup failed:", error)
  }

  return null
}

export const WARP_MACOS_DOWNLOAD_URL =
  "https://downloads.cloudflareclient.com/v1/download/macos/ga"

export const WARP_WINDOWS_DOWNLOAD_URL =
  "https://downloads.cloudflareclient.com/v1/download/windows/ga"
