import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import {
  buildGatewaySchedule,
  buildTrafficExpression,
  getPolicyCloudflareAccountId,
  mapPolicyTypeToAction,
} from "@/lib/services/content-policies/gateway-policies"
import {
  buildIdentityExpression,
  getOwnedGatewayPolicy,
} from "@/lib/services/content-policies/policy-ownership"
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
 * Sync one logical policy's Cloudflare Gateway rule to match current
 * device/profile assignments via `dns.location` + `identity.email`.
 *
 * Cloudflare does not accept SaaS device UUIDs as Gateway selectors.
 * Per-device DNS locations are the Phase 1 enforcement mechanism.
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
    const locationIds = await listLocationIdsForPolicy(userId, policyId)
    const hasAssignments = await hasAnyAssignment(userId, policyId)
    const hasDeviceAssignment = await policyHasDeviceAssignment(
      userId,
      policyId
    )

    const precedence = hasDeviceAssignment
      ? DEVICE_ASSIGNMENT_PRECEDENCE_BASE + stableOffset(policyId, 40)
      : hasAssignments
        ? PROFILE_ASSIGNMENT_PRECEDENCE_BASE + stableOffset(policyId, 40)
        : UNASSIGNED_POLICY_PRECEDENCE_BASE + stableOffset(policyId, 40)

    const email = await getUserEmailForSync(userId)
    const identity = buildIdentityExpression(email)

    const config = parseStoredConfig(policyRow.configuration_json)
    const draft = {
      ...config,
      locationIds,
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
    const existing = await getGatewayRule(
      accountId,
      policyRow.cloudflare_rule_id
    )
    if (!existing?.id) {
      throw new Error("Cloudflare Gateway rule missing for policy")
    }

    const action = mapPolicyTypeToAction(parsed.data.type)
    const ruleEnabled =
      policyRow.enabled && (!hasAssignments || locationIds.length > 0)

    await updateGatewayRule(accountId, policyRow.cloudflare_rule_id, {
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
    })

    await admin
      .from("tenant_gateway_policies")
      .update({
        precedence,
        updated_at: new Date().toISOString(),
      })
      .eq("id", policyId)
      .eq("user_id", userId)

    await admin
      .from("tenant_policy_assignments")
      .update({
        sync_status:
          hasAssignments && locationIds.length === 0 ? "pending" : "active",
        sync_error:
          hasAssignments && locationIds.length === 0
            ? "Waiting for device DNS locations"
            : null,
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

function stableOffset(id: string, mod: number): number {
  let hash = 0
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  }
  return hash % mod
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

/**
 * Compare expected assignment-backed location sets vs live Cloudflare rules.
 */
export async function reconcilePolicyGatewayRules(userId: string): Promise<{
  policiesChecked: number
  mismatches: Array<{
    policyId: string
    issue: string
  }>
}> {
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
    const live = ruleById.get(policy.cloudflare_rule_id)
    if (!live) {
      mismatches.push({
        policyId: policy.id,
        issue: `Cloudflare rule ${policy.cloudflare_rule_id} missing`,
      })
      continue
    }

    const expectedLocations = await listLocationIdsForPolicy(
      userId,
      policy.id
    )
    const traffic = live.traffic ?? ""
    for (const locationId of expectedLocations) {
      if (!traffic.includes(locationId)) {
        mismatches.push({
          policyId: policy.id,
          issue: `Expected dns.location ${locationId} missing from rule traffic`,
        })
      }
    }
  }

  return {
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
