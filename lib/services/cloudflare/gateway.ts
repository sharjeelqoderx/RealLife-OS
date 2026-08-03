import { cloudflareRequest } from "@/lib/cloudflare/client"
import { getCloudflareGatewayAuth } from "@/lib/cloudflare/config"

export type ZeroTrustGatewayAccount = {
  id?: string
  gateway_tag?: string
  provider_name?: string
}

/**
 * Enable Zero Trust Gateway on a Cloudflare account.
 * @see https://developers.cloudflare.com/api/resources/zero_trust/subresources/gateway/methods/create
 */
export async function createZeroTrustGateway(
  accountId: string
): Promise<ZeroTrustGatewayAccount> {
  return cloudflareRequest<ZeroTrustGatewayAccount>({
    method: "POST",
    path: `/accounts/${accountId}/gateway`,
    auth: getCloudflareGatewayAuth(),
  })
}

/**
 * Read Zero Trust Gateway account info (idempotent check before create).
 */
export async function getZeroTrustGateway(
  accountId: string
): Promise<ZeroTrustGatewayAccount | null> {
  try {
    return await cloudflareRequest<ZeroTrustGatewayAccount>({
      method: "GET",
      path: `/accounts/${accountId}/gateway`,
      auth: getCloudflareGatewayAuth(),
    })
  } catch {
    return null
  }
}

/**
 * Ensure Gateway is enabled — get existing or create.
 */
export async function ensureZeroTrustGateway(
  accountId: string
): Promise<ZeroTrustGatewayAccount> {
  const existing = await getZeroTrustGateway(accountId)
  if (existing?.gateway_tag || existing?.id) {
    return existing
  }
  return createZeroTrustGateway(accountId)
}
