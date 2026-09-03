import { cloudflareRequest } from "@/lib/cloudflare/client"
import { getCloudflareGatewayAuth } from "@/lib/cloudflare/config"
import { getSiteUrl } from "@/lib/env"
import type { GatewayRuleAction } from "@/lib/services/cloudflare/rules"

export const REALIFE_BLOCK_PAGE_HEADER = "This site is blocked by RealLife OS"

export type GatewayBlockPageLayer = "dns" | "http"

export function getGatewayBlockPageUrl(): string {
  return `${getSiteUrl()}/blocked`
}

export function buildGatewayBlockRuleSettings(input: {
  action: GatewayRuleAction
  policyName: string
  layer: GatewayBlockPageLayer
}): Record<string, unknown> | undefined {
  if (input.action !== "block") return undefined

  const blockReason = `${REALIFE_BLOCK_PAGE_HEADER} (${input.policyName})`
  const targetUri = getGatewayBlockPageUrl()

  if (input.layer === "dns") {
    return {
      block_page_enabled: true,
      block_reason: blockReason,
    }
  }

  return {
    block_reason: blockReason,
    block_page: {
      target_uri: targetUri,
      include_context: true,
    },
  }
}

type GatewayBlockPageSettings = {
  enabled?: boolean
  mode?: string
  target_uri?: string
  include_context?: boolean
  header_text?: string
  name?: string
}

type GatewayConfiguration = {
  settings?: {
    block_page?: GatewayBlockPageSettings
  }
}

export type GatewayBlockPageConfigStatus = {
  configured: boolean
  targetUri: string | null
  mode: string | null
  includeContext: boolean | null
}

export async function getGatewayConfiguration(
  accountId: string
): Promise<GatewayConfiguration> {
  return cloudflareRequest<GatewayConfiguration>({
    method: "GET",
    path: `/accounts/${accountId}/gateway/configuration`,
    auth: getCloudflareGatewayAuth(),
  })
}

export function readGatewayBlockPageStatus(
  config: GatewayConfiguration | null | undefined
): GatewayBlockPageConfigStatus {
  const blockPage = config?.settings?.block_page
  const expectedUri = getGatewayBlockPageUrl()
  const configured =
    blockPage?.enabled === true &&
    blockPage.mode === "redirect_uri" &&
    blockPage.target_uri === expectedUri &&
    blockPage.include_context === true

  return {
    configured,
    targetUri: blockPage?.target_uri ?? null,
    mode: blockPage?.mode ?? null,
    includeContext: blockPage?.include_context ?? null,
  }
}

/**
 * Point the shared Gateway account block page at RealLife OS `/blocked`.
 * Idempotent — skips the API call when already configured.
 */
export async function ensureGatewayBlockPageConfigured(
  accountId: string
): Promise<{ updated: boolean; status: GatewayBlockPageConfigStatus }> {
  const current = await getGatewayConfiguration(accountId)
  const status = readGatewayBlockPageStatus(current)
  if (status.configured) {
    return { updated: false, status }
  }

  const targetUri = getGatewayBlockPageUrl()
  await cloudflareRequest<GatewayConfiguration>({
    method: "PATCH",
    path: `/accounts/${accountId}/gateway/configuration`,
    auth: getCloudflareGatewayAuth(),
    body: {
      settings: {
        block_page: {
          enabled: true,
          mode: "redirect_uri",
          target_uri: targetUri,
          include_context: true,
          name: "RealLife OS",
          header_text: REALIFE_BLOCK_PAGE_HEADER,
        },
      },
    },
  })

  return {
    updated: true,
    status: readGatewayBlockPageStatus({
      settings: {
        block_page: {
          enabled: true,
          mode: "redirect_uri",
          target_uri: targetUri,
          include_context: true,
        },
      },
    }),
  }
}
