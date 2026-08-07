import { cloudflareRequest } from "@/lib/cloudflare/client"
import { getCloudflareGatewayAuth } from "@/lib/cloudflare/config"

export type GatewayRuleAction =
  | "allow"
  | "block"
  | "override"
  | "safesearch"
  | "ytrestricted"
  | "isolate"
  | "inspect"

export type GatewaySchedule = {
  sun?: string
  mon?: string
  tue?: string
  wed?: string
  thu?: string
  fri?: string
  sat?: string
  time_zone?: string
}

export type CreateGatewayRuleInput = {
  name: string
  action: GatewayRuleAction
  description?: string
  enabled?: boolean
  filters?: Array<"dns" | "http" | "l4" | "egress" | "dns_resolver">
  traffic?: string
  identity?: string
  device_posture?: string
  precedence?: number
  schedule?: GatewaySchedule
  rule_settings?: Record<string, unknown>
}

export type UpdateGatewayRuleInput = CreateGatewayRuleInput

export type GatewayRule = {
  id?: string
  name?: string
  description?: string
  action?: string
  enabled?: boolean
  filters?: string[]
  traffic?: string
  precedence?: number
  schedule?: GatewaySchedule
  created_at?: string
  updated_at?: string
}

/**
 * Create a Zero Trust Gateway DNS/HTTP rule.
 * @see https://developers.cloudflare.com/api/resources/zero_trust/subresources/gateway/subresources/rules/methods/create
 */
export async function createGatewayRule(
  accountId: string,
  input: CreateGatewayRuleInput
): Promise<GatewayRule> {
  return cloudflareRequest<GatewayRule>({
    method: "POST",
    path: `/accounts/${accountId}/gateway/rules`,
    auth: getCloudflareGatewayAuth(),
    body: {
      name: input.name,
      action: input.action,
      description: input.description,
      enabled: input.enabled ?? true,
      filters: input.filters ?? ["dns"],
      traffic: input.traffic,
      identity: input.identity,
      device_posture: input.device_posture,
      precedence: input.precedence,
      schedule: input.schedule,
      rule_settings: input.rule_settings,
    },
  })
}

/**
 * Update a Zero Trust Gateway rule.
 * @see https://developers.cloudflare.com/api/resources/zero_trust/subresources/gateway/subresources/rules/methods/update
 */
export async function updateGatewayRule(
  accountId: string,
  ruleId: string,
  input: UpdateGatewayRuleInput
): Promise<GatewayRule> {
  return cloudflareRequest<GatewayRule>({
    method: "PUT",
    path: `/accounts/${accountId}/gateway/rules/${ruleId}`,
    auth: getCloudflareGatewayAuth(),
    body: {
      name: input.name,
      action: input.action,
      description: input.description,
      enabled: input.enabled ?? true,
      filters: input.filters ?? ["dns"],
      traffic: input.traffic,
      identity: input.identity,
      device_posture: input.device_posture,
      precedence: input.precedence,
      schedule: input.schedule,
      rule_settings: input.rule_settings,
    },
  })
}

export async function listGatewayRules(
  accountId: string
): Promise<GatewayRule[]> {
  const result = await cloudflareRequest<GatewayRule[]>({
    method: "GET",
    path: `/accounts/${accountId}/gateway/rules`,
    auth: getCloudflareGatewayAuth(),
  })
  return result ?? []
}

export async function getGatewayRule(
  accountId: string,
  ruleId: string
): Promise<GatewayRule> {
  return cloudflareRequest<GatewayRule>({
    method: "GET",
    path: `/accounts/${accountId}/gateway/rules/${ruleId}`,
    auth: getCloudflareGatewayAuth(),
  })
}

/**
 * Delete a Zero Trust Gateway rule.
 * @see https://developers.cloudflare.com/api/resources/zero_trust/subresources/gateway/subresources/rules/methods/delete
 */
export async function deleteGatewayRule(
  accountId: string,
  ruleId: string
): Promise<void> {
  await cloudflareRequest<unknown>({
    method: "DELETE",
    path: `/accounts/${accountId}/gateway/rules/${ruleId}`,
    auth: getCloudflareGatewayAuth(),
  })
}
