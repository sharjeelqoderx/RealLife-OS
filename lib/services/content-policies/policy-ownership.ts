import { createAdminClient } from "@/lib/supabase/admin"
import type { Json } from "@/types/supabase"

const UNIQUE_GATEWAY_RULE_NAME_SUFFIX = /\s·\s\d{10,}$/

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

/** Customer UI name — never the Cloudflare uniqueness suffix. */
export function customerFacingGatewayPolicyName(
  ...candidates: Array<string | null | undefined>
): string {
  for (const candidate of candidates) {
    const trimmed = candidate?.trim()
    if (!trimmed) continue
    const stripped = trimmed.replace(UNIQUE_GATEWAY_RULE_NAME_SUFFIX, "").trim()
    if (stripped) return stripped
  }
  return "Untitled"
}

export type OwnedGatewayPolicy = {
  id: string
  cloudflareRuleId: string | null
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
    .select("id, cloudflare_rule_id, name")
    .eq("user_id", userId)
    .neq("status", "deleted")
    .neq("status", "failed")
    .neq("status", "pending")

  if (error) throw error
  return (data ?? []).map((policy) => ({
    id: policy.id,
    cloudflareRuleId: policy.cloudflare_rule_id,
    name: policy.name,
  }))
}

export async function insertPendingOwnedGatewayPolicy(input: {
  userId: string
  name: string
  description?: string | null
  type: string
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
      cloudflare_rule_id: null,
      action: input.action,
      enabled: input.enabled,
      precedence: input.precedence,
      configuration_json: input.configurationJson,
      status: "pending",
    })
    .select("id")
    .single()

  if (error) throw error
  return data.id
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
      status: "configured",
    })
    .select("id")
    .single()

  if (error) throw error
  return data.id
}

export async function attachOwnedGatewayPolicyRules(input: {
  userId: string
  policyId: string
  cloudflareRuleId: string
  status?: "pending" | "configured" | "failed"
}): Promise<void> {
  const { error } = await createAdminClient()
    .from("tenant_gateway_policies")
    .update({
      cloudflare_rule_id: input.cloudflareRuleId,
      status: input.status ?? "configured",
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", input.userId)
    .eq("id", input.policyId)

  if (error) throw error
}

export async function markOwnedGatewayPolicyStatus(
  userId: string,
  policyId: string,
  status: "pending" | "configured" | "failed" | "deleted"
): Promise<void> {
  const { error } = await createAdminClient()
    .from("tenant_gateway_policies")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("id", policyId)

  if (error) throw error
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
  const admin = createAdminClient()
  const { error } = await admin
    .from("tenant_gateway_policies")
    .update({
      status: "deleted",
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("id", policyId)

  if (error) throw error

  await admin
    .from("tenant_policy_assignments")
    .delete()
    .eq("user_id", userId)
    .eq("policy_id", policyId)
}

export function buildIdentityExpression(email: string): string {
  const escaped = email.replace(/\\/g, "\\\\").replace(/"/g, '\\"')
  return `identity.email == "${escaped}"`
}
