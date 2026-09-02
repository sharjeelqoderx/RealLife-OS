import { createAdminClient } from "@/lib/supabase/admin"
import {
  createGatewayRule,
  deleteGatewayRule,
  isMissingGatewayRuleError,
  getGatewayRule,
  listGatewayRules,
  type GatewayRuleAction,
} from "@/lib/services/cloudflare/rules"
import {
  buildFallbackDnsTrafficExpression,
  FALLBACK_DNS_PRECEDENCE_BASE,
  takeNextGatewayPrecedence,
} from "@/lib/services/content-policies/gateway-policy-layers"
import {
  buildIdentityExpression,
  uniqueCloudflareGatewayRuleName,
} from "@/lib/services/content-policies/policy-ownership"

export type MappedGatewayRule = {
  id: string
  cloudflareRuleId: string
  ruleRole: string
}

export async function listMappedGatewayRules(
  userId: string,
  policyId: string
): Promise<MappedGatewayRule[]> {
  const { data, error } = await createAdminClient()
    .from("tenant_policy_gateway_rules")
    .select("id, cloudflare_rule_id, rule_role")
    .eq("user_id", userId)
    .eq("policy_id", policyId)
    .neq("sync_status", "deleted")

  if (error) throw error
  return (data ?? []).map((row) => ({
    id: row.id,
    cloudflareRuleId: row.cloudflare_rule_id,
    ruleRole: row.rule_role,
  }))
}

export async function recordMappedGatewayRule(input: {
  userId: string
  policyId: string
  cloudflareRuleId: string
  ruleRole: string
  targetType?: "device" | "profile" | "account"
}): Promise<void> {
  const { error } = await createAdminClient().from("tenant_policy_gateway_rules").upsert(
    {
      user_id: input.userId,
      policy_id: input.policyId,
      cloudflare_rule_id: input.cloudflareRuleId,
      rule_role: input.ruleRole,
      target_type: input.targetType ?? "account",
      sync_status: "active",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "cloudflare_rule_id" }
  )
  if (error) throw error
}

export async function markMappedGatewayRuleDeleted(
  userId: string,
  cloudflareRuleId: string
): Promise<void> {
  await createAdminClient()
    .from("tenant_policy_gateway_rules")
    .update({
      sync_status: "deleted",
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("cloudflare_rule_id", cloudflareRuleId)
}

/**
 * One identity-scoped L4 fallback-DNS rule per customer.
 * Shared across that user's policies; not a global account rule.
 */
export async function ensureIdentityFallbackDnsRule(input: {
  accountId: string
  userId: string
  policyId: string
  email: string
}): Promise<{ ruleId: string; created: boolean }> {
  const admin = createAdminClient()
  const { data: existing } = await admin
    .from("tenant_policy_gateway_rules")
    .select("cloudflare_rule_id, policy_id")
    .eq("user_id", input.userId)
    .eq("rule_role", "l4_fallback_dns")
    .neq("sync_status", "deleted")
    .limit(1)
    .maybeSingle()

  if (existing?.cloudflare_rule_id) {
    try {
      const live = await getGatewayRule(input.accountId, existing.cloudflare_rule_id)
      if (live?.id) {
        return { ruleId: live.id, created: false }
      }
    } catch {
      // Recreate below.
    }
  }

  const identity = buildIdentityExpression(input.email)
  const liveRules = await listGatewayRules(input.accountId)
  const usedPrecedences = new Set(
    liveRules
      .map((rule) => rule.precedence)
      .filter((value): value is number => typeof value === "number")
  )
  const rule = await createGatewayRule(input.accountId, {
    name: uniqueCloudflareGatewayRuleName(`RL fallback DNS · ${input.email}`),
    action: "block" satisfies GatewayRuleAction,
    description:
      "Block outbound DNS/DoT to public resolvers so apps cannot bypass Gateway DNS.",
    enabled: true,
    filters: ["l4"],
    traffic: buildFallbackDnsTrafficExpression(),
    identity,
    precedence: takeNextGatewayPrecedence(
      usedPrecedences,
      FALLBACK_DNS_PRECEDENCE_BASE
    ),
  })

  if (!rule.id) {
    throw new Error("Cloudflare did not return a fallback DNS rule id")
  }

  await recordMappedGatewayRule({
    userId: input.userId,
    policyId: input.policyId,
    cloudflareRuleId: rule.id,
    ruleRole: "l4_fallback_dns",
  })
  return { ruleId: rule.id, created: true }
}

export async function deleteMappedCloudflareRules(input: {
  accountId: string
  userId: string
  policyId: string
}): Promise<void> {
  const mapped = await listMappedGatewayRules(input.userId, input.policyId)
  const admin = createAdminClient()

  for (const row of mapped) {
    if (row.ruleRole === "l4_fallback_dns") {
      const { data: otherPolicies } = await admin
        .from("tenant_gateway_policies")
        .select("id")
        .eq("user_id", input.userId)
        .neq("id", input.policyId)
        .neq("status", "deleted")
        .neq("status", "failed")
        .limit(1)

      const nextPolicyId = otherPolicies?.[0]?.id
      if (nextPolicyId) {
        await admin
          .from("tenant_policy_gateway_rules")
          .update({
            policy_id: nextPolicyId,
            updated_at: new Date().toISOString(),
          })
          .eq("cloudflare_rule_id", row.cloudflareRuleId)
          .eq("user_id", input.userId)
        continue
      }
    }

    try {
      await deleteGatewayRule(input.accountId, row.cloudflareRuleId)
    } catch (error) {
      if (!isMissingGatewayRuleError(error)) {
        throw error
      }
    }
    await markMappedGatewayRuleDeleted(input.userId, row.cloudflareRuleId)
  }
}

export async function compensateCreatedCloudflareRules(
  accountId: string,
  ruleIds: string[]
): Promise<void> {
  for (const ruleId of [...new Set(ruleIds)].filter(Boolean)) {
    try {
      await deleteGatewayRule(accountId, ruleId)
    } catch {
      console.error("Failed to compensate for unowned Cloudflare rule", { ruleId })
    }
  }
}

