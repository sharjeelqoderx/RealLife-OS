import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import {
  buildGatewaySchedule,
  buildHttpLayerTraffic,
  buildTrafficExpression,
  getPolicyCloudflareAccountId,
  mapPolicyTypeToAction,
} from "@/lib/services/content-policies/gateway-policies"
import {
  assignmentPrecedenceBase,
  pickUniqueGatewayPrecedence,
  policyStablePrecedenceOffset,
  shouldCreateFallbackDnsLayer,
  shouldCreateHttpLayer,
  takeNextGatewayPrecedence,
} from "@/lib/services/content-policies/gateway-policy-layers"
import { ensureIdentityFallbackDnsRule } from "@/lib/services/content-policies/policy-rule-mapping"
import {
  buildIdentityExpression,
  getOwnedGatewayPolicy,
} from "@/lib/services/content-policies/policy-ownership"
import {
  buildGatewayBlockRuleSettings,
  ensureGatewayBlockPageConfigured,
} from "@/lib/services/cloudflare/gateway-block-page"
import {
  getGatewayRule,
  listGatewayRules,
  updateGatewayRule,
} from "@/lib/services/cloudflare/rules"
import { ensureDeviceDnsLocation } from "@/lib/services/devices/device-dns-location"
import {
  createGatewayPolicySchema,
  type CreateGatewayPolicyInput,
} from "@/schemas/content-policies/gateway-policy"
import type { Json } from "@/types/supabase"

/** Lower number = higher Cloudflare Gateway priority (first-match). */
export const DEVICE_ASSIGNMENT_PRECEDENCE_BASE = 100
export const PROFILE_ASSIGNMENT_PRECEDENCE_BASE = 500
export const UNASSIGNED_POLICY_PRECEDENCE_BASE = 1000

/**
 * Sync one logical policy's Cloudflare Gateway rules for current assignments.
 *
 * Enforcement uses `identity.email` (+ DNS/HTTP/L4 layers). Per-device DNS
 * locations are still provisioned for optional DoH profiles, but Gateway traffic
 * is not scoped with `dns.location` on sync — WARP on Android (and most clients
 * without MDM `gateway_unique_id`) uses the org default location, so location
 * selectors silently prevent block rules from matching.
 *
 * @see https://developers.cloudflare.com/api/resources/zero_trust/subresources/gateway/subresources/rules/methods/update/
 * @see https://developers.cloudflare.com/cloudflare-one/traffic-policies/order-of-enforcement/
 */
export async function syncPolicyCloudflareEnforcement(
  userId: string,
  policyId: string
): Promise<{ syncStatus: "active" | "sync_failed"; error?: string }> {
  const admin = createAdminClient()

  try {
    const { data: policyRow, error: policyError } = await admin
      .from("tenant_gateway_policies")
      .select(
        "id, name, type, action, enabled, precedence, configuration_json, cloudflare_rule_id, status"
      )
      .eq("id", policyId)
      .eq("user_id", userId)
      .neq("status", "deleted")
      .maybeSingle()

    if (policyError) throw policyError
    if (!policyRow) throw new Error("Policy not found")

    const accountId = await getPolicyCloudflareAccountId(userId)
    const { ensureDefaultTrafficAndDnsProfile } = await import(
      "@/lib/services/cloudflare/device-policy"
    )
    // Same account prep Repair Gateway runs — required on first assign so users
    // do not need a manual Repair after creating a profile + policy.
    await ensureDefaultTrafficAndDnsProfile(accountId)
    await listLocationIdsForPolicy(userId, policyId)
    const hasAssignments = await hasAnyAssignment(userId, policyId)
    const hasDeviceAssignment = await policyHasDeviceAssignment(
      userId,
      policyId
    )

    const email = await getUserEmailForSync(userId)
    const identity = buildIdentityExpression(email)

    const config = parseStoredConfig(policyRow.configuration_json)
    const draftAction = mapPolicyTypeToAction(
      (config.type ?? policyRow.type) as CreateGatewayPolicyInput["type"]
    )

    if (!policyRow.cloudflare_rule_id) {
      throw new Error("Cloudflare Gateway rule missing for policy")
    }

    const existing = await getGatewayRule(
      accountId,
      policyRow.cloudflare_rule_id
    )
    if (!existing?.id) {
      throw new Error("Cloudflare Gateway rule missing for policy")
    }

    // Cloudflare rejects updates when precedence collides with another rule
    // (including this policy's HTTP/L4 siblings). Free the DNS rule's current
    // slot, then pick the next free number near the preferred band.
    const liveRules = await listGatewayRules(accountId)
    const preferredPrecedence =
      assignmentPrecedenceBase({
        action: draftAction,
        hasDeviceAssignment,
        hasAssignments,
      }) + policyStablePrecedenceOffset(policyId)
    const precedence = pickUniqueGatewayPrecedence({
      used: liveRules.map((rule) => rule.precedence),
      preferred: preferredPrecedence,
      retainPrecedence: existing.precedence,
    })

    const draft = {
      ...config,
      locationIds: [],
      name: policyRow.name,
      type: (config.type ?? policyRow.type) as CreateGatewayPolicyInput["type"],
      enabled: policyRow.enabled,
      precedence,
    }

    const parsed = createGatewayPolicySchema.safeParse(draft)
    if (!parsed.success) {
      throw new Error(
        parsed.error.issues[0]?.message ?? "Invalid policy configuration"
      )
    }

    const { traffic, filters } = await buildTrafficExpression(
      accountId,
      parsed.data
    )

    const action = mapPolicyTypeToAction(parsed.data.type)
    const ruleEnabled = policyRow.enabled !== false

    if (action === "block") {
      await ensureGatewayBlockPageConfigured(accountId)
    }

    const dnsRulePayload = {
      name:
        existing.name?.trim() ||
        `RL policy ${policyRow.name}`.slice(0, 175),
      action,
      description: parsed.data.description,
      enabled: ruleEnabled,
      filters,
      traffic,
      identity,
      schedule: buildGatewaySchedule(
        parsed.data.schedules,
        parsed.data.timeZone
      ),
      precedence,
      rule_settings: buildGatewayBlockRuleSettings({
        action,
        policyName: policyRow.name,
        layer: "dns",
      }),
    }

    await updateGatewayRule(
      accountId,
      policyRow.cloudflare_rule_id,
      dnsRulePayload
    )

    // Confirm identity-only traffic stuck (stale dns.location silently no-ops WARP).
    const verified = await getGatewayRule(
      accountId,
      policyRow.cloudflare_rule_id
    )
    if ((verified.traffic ?? "").includes("dns.location")) {
      await updateGatewayRule(
        accountId,
        policyRow.cloudflare_rule_id,
        dnsRulePayload
      )
    }

    const { listMappedGatewayRules } = await import(
      "@/lib/services/content-policies/policy-rule-mapping"
    )
    const mapped = await listMappedGatewayRules(userId, policyId)
    const httpMapped = mapped.find((row) => row.ruleRole === "http")
    const httpTraffic = await buildHttpLayerTraffic(accountId, parsed.data)
    if (!httpMapped && shouldCreateHttpLayer(parsed.data.type, httpTraffic) && httpTraffic) {
      try {
        const { createGatewayRule } = await import("@/lib/services/cloudflare/rules")
        const { uniqueCloudflareGatewayRuleName } = await import(
          "@/lib/services/content-policies/policy-ownership"
        )
        const { recordMappedGatewayRule } = await import(
          "@/lib/services/content-policies/policy-rule-mapping"
        )
        const rulesAfterDns = await listGatewayRules(accountId)
        const usedPrecedences = new Set(
          rulesAfterDns
            .map((rule) => rule.precedence)
            .filter((value): value is number => typeof value === "number")
        )
        const httpAction = action === "allow" ? "allow" : "block"
        const httpRule = await createGatewayRule(accountId, {
          name: uniqueCloudflareGatewayRuleName(`${policyRow.name} · HTTP`),
          action: httpAction,
          description: parsed.data.description,
          enabled: ruleEnabled,
          filters: ["http"],
          traffic: httpTraffic,
          identity,
          schedule: buildGatewaySchedule(
            parsed.data.schedules,
            parsed.data.timeZone
          ),
          precedence: takeNextGatewayPrecedence(usedPrecedences, precedence + 1),
          rule_settings: buildGatewayBlockRuleSettings({
            action: httpAction,
            policyName: policyRow.name,
            layer: "http",
          }),
        })
        if (httpRule.id) {
          await recordMappedGatewayRule({
            userId,
            policyId,
            cloudflareRuleId: httpRule.id,
            ruleRole: "http",
          })
        }
      } catch (httpCreateError) {
        console.warn("HTTP Gateway layer create skipped", httpCreateError)
      }
    }
    if (httpMapped && httpTraffic) {
      try {
        const httpAction = action === "allow" ? "allow" : "block"
        const rulesAfterDns = await listGatewayRules(accountId)
        const httpLive = rulesAfterDns.find(
          (rule) => rule.id === httpMapped.cloudflareRuleId
        )
        const httpPrecedence = pickUniqueGatewayPrecedence({
          used: rulesAfterDns.map((rule) => rule.precedence),
          preferred: precedence + 1,
          retainPrecedence: httpLive?.precedence,
        })
        await updateGatewayRule(accountId, httpMapped.cloudflareRuleId, {
          name: `RL HTTP ${policyRow.name}`.slice(0, 175),
          action: httpAction,
          description: parsed.data.description,
          enabled: ruleEnabled,
          filters: ["http"],
          traffic: httpTraffic,
          identity,
          schedule: buildGatewaySchedule(
            parsed.data.schedules,
            parsed.data.timeZone
          ),
          precedence: httpPrecedence,
          rule_settings: buildGatewayBlockRuleSettings({
            action: httpAction,
            policyName: policyRow.name,
            layer: "http",
          }),
        })
      } catch (httpError) {
        console.warn("HTTP Gateway layer sync skipped", httpError)
      }
    }

    if (shouldCreateFallbackDnsLayer(parsed.data.type)) {
      await ensureIdentityFallbackDnsRule({
        accountId,
        userId,
        policyId,
        email,
      })
    }

    await admin
      .from("tenant_gateway_policies")
      .update({
        precedence,
        configuration_json: {
          ...config,
          locationIds: [],
        } as Json,
        updated_at: new Date().toISOString(),
      })
      .eq("id", policyId)
      .eq("user_id", userId)

    await admin
      .from("tenant_policy_assignments")
      .update({
        sync_status: "active",
        sync_error: null,
        cloudflare_rule_id: policyRow.cloudflare_rule_id,
        precedence,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("policy_id", policyId)

    await admin.from("tenant_policy_gateway_rules").upsert(
      {
        user_id: userId,
        policy_id: policyId,
        cloudflare_rule_id: policyRow.cloudflare_rule_id,
        rule_role: "primary",
        target_type: "account",
        sync_status: "active",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "cloudflare_rule_id" }
    )

    return { syncStatus: "active" }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Cloudflare sync failed"
    console.error("syncPolicyCloudflareEnforcement:", message)

    await createAdminClient()
      .from("tenant_policy_assignments")
      .update({
        sync_status: "sync_failed",
        sync_error: message,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("policy_id", policyId)

    return { syncStatus: "sync_failed", error: message }
  }
}

export async function listLocationIdsForPolicy(
  userId: string,
  policyId: string
): Promise<string[]> {
  const admin = createAdminClient()
  const accountId = await getPolicyCloudflareAccountId(userId)
  const deviceIds = await listDeviceIdsForPolicy(userId, policyId)
  const locationIds: string[] = []

  for (const deviceId of deviceIds) {
    const { data: device } = await admin
      .from("tenant_device_metadata")
      .select("id, display_name, cloudflare_location_id")
      .eq("id", deviceId)
      .eq("user_id", userId)
      .maybeSingle()

    if (!device) continue

    if (device.cloudflare_location_id) {
      locationIds.push(device.cloudflare_location_id)
      continue
    }

    const ensured = await ensureDeviceDnsLocation({
      accountId,
      userId,
      deviceId: device.id,
      displayName: device.display_name ?? "Device",
    })
    locationIds.push(ensured.locationId)
  }

  return [...new Set(locationIds)]
}

export async function listDeviceIdsForPolicy(
  userId: string,
  policyId: string
): Promise<string[]> {
  const admin = createAdminClient()
  const { data: assignments, error } = await admin
    .from("tenant_policy_assignments")
    .select("target_type, target_id")
    .eq("user_id", userId)
    .eq("policy_id", policyId)

  if (error) throw error

  const deviceIds = new Set<string>()

  for (const assignment of assignments ?? []) {
    if (assignment.target_type === "device") {
      deviceIds.add(assignment.target_id)
      continue
    }

    const { data: members } = await admin
      .from("tenant_device_profile_members")
      .select("device_id")
      .eq("profile_id", assignment.target_id)

    for (const member of members ?? []) {
      deviceIds.add(member.device_id)
    }
  }

  return [...deviceIds]
}

async function policyHasDeviceAssignment(
  userId: string,
  policyId: string
): Promise<boolean> {
  const admin = createAdminClient()
  const { data } = await admin
    .from("tenant_policy_assignments")
    .select("id")
    .eq("user_id", userId)
    .eq("policy_id", policyId)
    .eq("target_type", "device")
    .limit(1)
  return (data?.length ?? 0) > 0
}

async function hasAnyAssignment(
  userId: string,
  policyId: string
): Promise<boolean> {
  const admin = createAdminClient()
  const { data } = await admin
    .from("tenant_policy_assignments")
    .select("id")
    .eq("user_id", userId)
    .eq("policy_id", policyId)
    .limit(1)
  return (data?.length ?? 0) > 0
}

function parseStoredConfig(value: Json | null): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      categories: [],
      categoryIds: [],
      domains: [],
      domainRoots: [],
      domainKeywords: [],
      apps: [],
      appIds: [],
      locationIds: [],
      schedules: [],
    }
  }
  return value as Record<string, unknown>
}

async function getUserEmailForSync(userId: string): Promise<string> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user?.id === userId && user.email) {
    return user.email.trim().toLowerCase()
  }

  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.getUserById(userId)
  if (error || !data.user?.email) {
    throw new Error("Unable to resolve user email for Gateway identity")
  }
  return data.user.email.trim().toLowerCase()
}

/** Re-push every assigned policy to Cloudflare (fixes stale dns.location rules). */
export async function resyncAllAssignedPolicies(userId: string): Promise<{
  policiesSynced: number
  orphansRemoved: number
  failures: Array<{ policyId: string; error: string }>
}> {
  const admin = createAdminClient()
  const { data: assignments, error } = await admin
    .from("tenant_policy_assignments")
    .select("id, policy_id")
    .eq("user_id", userId)

  if (error) throw error

  const byPolicy = new Map<string, string[]>()
  for (const row of assignments ?? []) {
    const list = byPolicy.get(row.policy_id) ?? []
    list.push(row.id)
    byPolicy.set(row.policy_id, list)
  }

  const failures: Array<{ policyId: string; error: string }> = []
  let policiesSynced = 0
  let orphansRemoved = 0

  for (const [policyId, assignmentIds] of byPolicy) {
    const { data: policyRow, error: policyError } = await admin
      .from("tenant_gateway_policies")
      .select("id, status, cloudflare_rule_id")
      .eq("id", policyId)
      .eq("user_id", userId)
      .maybeSingle()

    if (policyError) throw policyError

    if (!policyRow || policyRow.status === "deleted") {
      const { error: deleteError } = await admin
        .from("tenant_policy_assignments")
        .delete()
        .in("id", assignmentIds)
        .eq("user_id", userId)
      if (deleteError) throw deleteError
      orphansRemoved += assignmentIds.length
      continue
    }

    if (!policyRow.cloudflare_rule_id) {
      failures.push({
        policyId,
        error:
          "Cloudflare Gateway rule missing for this policy. Open Content Policies, edit and save the policy, then try Repair again.",
      })
      continue
    }

    const result = await syncPolicyCloudflareEnforcement(userId, policyId)
    if (result.syncStatus === "sync_failed") {
      failures.push({
        policyId,
        error: result.error ?? "Cloudflare sync failed",
      })
    } else {
      policiesSynced += 1
    }
  }

  return { policiesSynced, orphansRemoved, failures }
}

/**
 * Re-sync assigned policies, then compare live Cloudflare rules vs expectations.
 */
export async function reconcilePolicyGatewayRules(userId: string): Promise<{
  resync: Awaited<ReturnType<typeof resyncAllAssignedPolicies>>
  policiesChecked: number
  mismatches: Array<{
    policyId: string
    issue: string
  }>
}> {
  const resync = await resyncAllAssignedPolicies(userId)
  const admin = createAdminClient()
  const accountId = await getPolicyCloudflareAccountId(userId)
  const rules = await listGatewayRules(accountId)
  const ruleById = new Map(
    rules.filter((r) => r.id).map((r) => [r.id as string, r])
  )

  const { data: policies } = await admin
    .from("tenant_gateway_policies")
    .select("id, cloudflare_rule_id, name")
    .eq("user_id", userId)
    .neq("status", "deleted")

  const mismatches: Array<{ policyId: string; issue: string }> = []

  for (const policy of policies ?? []) {
    const cloudflareRuleId = policy.cloudflare_rule_id
    if (!cloudflareRuleId) continue
    const live = ruleById.get(cloudflareRuleId)
    if (!live) {
      mismatches.push({
        policyId: policy.id,
        issue: `Cloudflare rule ${cloudflareRuleId} missing`,
      })
      continue
    }

    const traffic = live.traffic ?? ""
    if (traffic.includes("dns.location")) {
      mismatches.push({
        policyId: policy.id,
        issue:
          "DNS rule still scoped by dns.location; re-sync to use identity-only enforcement",
      })
    }
  }

  return {
    resync,
    policiesChecked: policies?.length ?? 0,
    mismatches,
  }
}

export async function requireOwnedPolicy(
  userId: string,
  policyId: string
): Promise<void> {
  await getOwnedGatewayPolicy(userId, policyId)
}
