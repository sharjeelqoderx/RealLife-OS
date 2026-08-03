import { cloudflareRequest } from "@/lib/cloudflare/client"
import { getCloudflareGatewayAuth } from "@/lib/cloudflare/config"

export type GatewayLocationEndpoints = {
  doh?: {
    enabled?: boolean
    networks?: Array<{ network: string }>
    require_token?: boolean
  }
  dot?: {
    enabled?: boolean
    networks?: Array<{ network: string }>
  }
  ipv4?: { enabled?: boolean }
  ipv6?: {
    enabled?: boolean
    networks?: Array<{ network: string }>
  }
}

export type CreateGatewayLocationInput = {
  name: string
  clientDefault?: boolean
  /** Enable DoH for iOS .mobileconfig / encrypted DNS profiles. */
  enableDoh?: boolean
  /** Enable DoT for Android Private DNS. */
  enableDot?: boolean
  enableIpv4?: boolean
  enableIpv6?: boolean
  requireDohToken?: boolean
}

export type GatewayLocation = {
  id?: string
  name?: string
  client_default?: boolean
  created_at?: string
  updated_at?: string
  doh_subdomain?: string
  ipv4_destination?: string
  ipv4_destination_backup?: string
  ip?: string
  endpoints?: GatewayLocationEndpoints
  dns_destination_ips_id?: string
}

function getGatewayAuth() {
  return getCloudflareGatewayAuth()
}

/**
 * Create a Gateway DNS location with DoH + DoT endpoints for device setup.
 * @see https://developers.cloudflare.com/api/resources/zero_trust/subresources/gateway/subresources/locations/methods/create
 */
export async function createGatewayLocation(
  accountId: string,
  input: CreateGatewayLocationInput
): Promise<GatewayLocation> {
  const enableDoh = input.enableDoh ?? true
  const enableDot = input.enableDot ?? true
  const enableIpv4 = input.enableIpv4 ?? true
  const enableIpv6 = input.enableIpv6 ?? true

  const body = {
    name: input.name,
    client_default: input.clientDefault ?? true,
    endpoints: {
      doh: {
        enabled: enableDoh,
        require_token: input.requireDohToken ?? false,
      },
      dot: {
        enabled: enableDot,
      },
      ipv4: {
        enabled: enableIpv4,
      },
      ipv6: {
        enabled: enableIpv6,
      },
    } satisfies GatewayLocationEndpoints,
  }

  return cloudflareRequest<GatewayLocation>({
    method: "POST",
    path: `/accounts/${accountId}/gateway/locations`,
    auth: getGatewayAuth(),
    body,
  })
}

export async function listGatewayLocations(
  accountId: string
): Promise<GatewayLocation[]> {
  const result = await cloudflareRequest<GatewayLocation[]>({
    method: "GET",
    path: `/accounts/${accountId}/gateway/locations`,
    auth: getGatewayAuth(),
  })
  return result ?? []
}
