import { createAdminClient } from "@/lib/supabase/admin"
import type { Json } from "@/types/supabase"

/** Cloudflare Gateway rule names must be unique in the shared account. */
export function uniqueCloudflareGatewayRuleName(
  displayName: string,
  now = new Date(),
  maxLength = 175
): string {
  const stamp = String(now.getTime())
  const suffix = ` · ${stamp}`
  const budget = Math.max(1, maxLength - suffix.length)
  const base = displayName.trim().slice(0, budget)
  return `${base}${suffix}`
}

export type OwnedGatewayPolicy = {
  id: string
  cloudflareRuleId: string
  name?: string | null
  configurationJson?: Json | null
}

export async function requirePolicyOwnershipStore(): Promise<void> {
  const { error } = await createAdminClient()
    .from("tenant_gateway_policies")
    .select("id")
    .limit(1)

  if (error) {
    if (error.code === "PGRST205" || /does not exist/i.test(error.message)) {
      throw new Error(
        "Policy ownership is unavailable. Apply the tenant_gateway_policies migration before creating policies."
      )
    }
    throw error
  }
}

export async function getOwnedGatewayPolicy(
  userId: string,
  policyId: string
): Promise<OwnedGatewayPolicy> {
  const { data, error } = await createAdminClient()
    .from("tenant_gateway_policies")
    .select("id, cloudflare_rule_id, name, configuration_json")
    .eq("user_id", userId)
    .eq("id", policyId)
    .neq("status", "deleted")
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error("Policy not found")

  return {
    id: data.id,
    cloudflareRuleId: data.cloudflare_rule_id,
    name: data.name,
    configurationJson: data.configuration_json,
  }
}

export async function listOwnedGatewayPolicies(
  userId: string
): Promise<OwnedGatewayPolicy[]> {
  const { data, error } = await createAdminClient()
    .from("tenant_gateway_policies")
    .select("id, cloudflare_rule_id")
    .eq("user_id", userId)
    .neq("status", "deleted")

  if (error) throw error
  return (data ?? []).map((policy) => ({
    id: policy.id,
    cloudflareRuleId: policy.cloudflare_rule_id,
  }))
}

export async function recordOwnedGatewayPolicy(input: {
  userId: string
  name: string
  description?: string | null
  type: string
  cloudflareRuleId: string
  action: string
  enabled: boolean
  precedence: number
  configurationJson: Json
}): Promise<string> {
  const { data, error } = await createAdminClient()
    .from("tenant_gateway_policies")
    .insert({
      user_id: input.userId,
      name: input.name,
      description: input.description ?? null,
      type: input.type,
      cloudflare_rule_id: input.cloudflareRuleId,
      action: input.action,
      enabled: input.enabled,
      precedence: input.precedence,
      configuration_json: input.configurationJson,
      status: "active",
    })
    .select("id")
    .single()

  if (error) throw error
  return data.id
}

export async function updateOwnedGatewayPolicyRecord(input: {
  userId: string
  policyId: string
  name: string
  description?: string | null
  type: string
  action: string
  enabled: boolean
  precedence: number
  configurationJson: Json
}): Promise<void> {
  const { error } = await createAdminClient()
    .from("tenant_gateway_policies")
    .update({
      name: input.name,
      description: input.description ?? null,
      type: input.type,
      action: input.action,
      enabled: input.enabled,
      precedence: input.precedence,
      configuration_json: input.configurationJson,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", input.userId)
    .eq("id", input.policyId)

  if (error) throw error
}

export async function markOwnedGatewayPolicyDeleted(
  userId: string,
  policyId: string
): Promise<void> {
  const { error } = await createAdminClient()
    .from("tenant_gateway_policies")
    .update({
      status: "deleted",
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("id", policyId)

  if (error) throw error
}

export function buildIdentityExpression(email: string): string {
  const escaped = email.replace(/\\/g, "\\\\").replace(/"/g, '\\"')
  return `identity.email == "${escaped}"`
}
