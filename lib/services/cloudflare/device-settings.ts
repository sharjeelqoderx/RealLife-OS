import { cloudflareRequest } from "@/lib/cloudflare/client"
import { getCloudflareGatewayAuth } from "@/lib/cloudflare/config"

export type CloudflareAccountDeviceSettings = {
  gateway_proxy_enabled?: boolean
  gateway_udp_proxy_enabled?: boolean
}

/**
 * Account-level WARP settings required for HTTP/L4 Gateway inspection.
 * Separate from the default device profile (`/devices/policy`).
 *
 * @see https://developers.cloudflare.com/api/resources/zero_trust/subresources/devices/subresources/settings/methods/edit/
 */
export async function getAccountDeviceSettings(
  accountId: string
): Promise<CloudflareAccountDeviceSettings> {
  return cloudflareRequest<CloudflareAccountDeviceSettings>({
    method: "GET",
    path: `/accounts/${accountId}/devices/settings`,
    auth: getCloudflareGatewayAuth(),
  })
}

export type GatewayProxySettingsStatus = {
  tcpProxyEnabled: boolean
  udpProxyEnabled: boolean
}

export function readGatewayProxySettingsStatus(
  settings: CloudflareAccountDeviceSettings | null | undefined
): GatewayProxySettingsStatus {
  return {
    tcpProxyEnabled: settings?.gateway_proxy_enabled === true,
    udpProxyEnabled: settings?.gateway_udp_proxy_enabled === true,
  }
}

/** HTTP policies and QUIC/HTTP3 inspection need TCP + UDP Gateway proxy enabled. */
export async function ensureGatewayProxyEnabled(
  accountId: string
): Promise<GatewayProxySettingsStatus> {
  const current = await getAccountDeviceSettings(accountId)
  const status = readGatewayProxySettingsStatus(current)
  if (status.tcpProxyEnabled && status.udpProxyEnabled) {
    return status
  }

  await cloudflareRequest<CloudflareAccountDeviceSettings>({
    method: "PATCH",
    path: `/accounts/${accountId}/devices/settings`,
    auth: getCloudflareGatewayAuth(),
    body: {
      gateway_proxy_enabled: true,
      gateway_udp_proxy_enabled: true,
    },
  })

  const updated = await getAccountDeviceSettings(accountId)
  return readGatewayProxySettingsStatus(updated)
}
