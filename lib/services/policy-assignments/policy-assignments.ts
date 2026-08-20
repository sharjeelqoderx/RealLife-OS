import { createAdminClient } from "@/lib/supabase/admin"
import {
  requireAuthenticatedUserId,
} from "@/lib/services/devices/context"
import {
  syncPolicyCloudflareEnforcement,
  DEVICE_ASSIGNMENT_PRECEDENCE_BASE,
  PROFILE_ASSIGNMENT_PRECEDENCE_BASE,
} from "@/lib/services/policy-assignments/sync-policy-enforcement"

export type PolicyAssignmentTargetType = "device" | "profile"

export type PolicyAssignmentListItem = {
  id: string
  policyId: string
  policyName: string
  targetType: PolicyAssignmentTargetType
  targetId: string
  targetName: string
  precedence: number
  syncStatus: "pending" | "active" | "sync_failed"
  syncError: string | null
  overridesProfilePolicy: boolean
  createdAt: string
  updatedAt: string
}

export async function listPolicyAssignments(): Promise<
  PolicyAssignmentListItem[]
> {
  const userId = await requireAuthenticatedUserId()
  const admin = createAdminClient()

  const { data: rows, error } = await admin
    .from("tenant_policy_assignments")
    .select(
      "id, policy_id, target_type, target_id, precedence, sync_status, sync_error, created_at, updated_at, tenant_gateway_policies(name)"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) throw error

  const deviceIds = (rows ?? [])
    .filter((r) => r.target_type === "device")
    .map((r) => r.target_id)
  const profileIds = (rows ?? [])
    .filter((r) => r.target_type === "profile")
    .map((r) => r.target_id)

  const deviceNames = new Map<string, string>()
  if (deviceIds.length > 0) {
    const { data: devices } = await admin
      .from("tenant_device_metadata")
      .select("id, display_name")
      .eq("user_id", userId)
      .in("id", deviceIds)
    for (const device of devices ?? []) {
      deviceNames.set(device.id, device.display_name?.trim() || "Device")
    }
  }

  const profileNames = new Map<string, string>()
  if (profileIds.length > 0) {
    const { data: profiles } = await admin
      .from("tenant_device_profiles")
      .select("id, name")
      .eq("user_id", userId)
      .in("id", profileIds)
    for (const profile of profiles ?? []) {
      profileNames.set(profile.id, profile.name)
    }
  }

  const results: PolicyAssignmentListItem[] = []

  for (const row of rows ?? []) {
    const policyName =
      row.tenant_gateway_policies &&
      typeof row.tenant_gateway_policies === "object" &&
      !Array.isArray(row.tenant_gateway_policies) &&
      "name" in row.tenant_gateway_policies
        ? String(
            (row.tenant_gateway_policies as { name: string }).name
          )
        : "Policy"

    let overridesProfilePolicy = false
    if (row.target_type === "device") {
      const { data: membership } = await admin
        .from("tenant_device_profile_members")
        .select("profile_id")
        .eq("device_id", row.target_id)
        .maybeSingle()
      if (membership?.profile_id) {
        const { data: profileAssignment } = await admin
          .from("tenant_policy_assignments")
          .select("id")
          .eq("user_id", userId)
          .eq("target_type", "profile")
          .eq("target_id", membership.profile_id)
          .maybeSingle()
        overridesProfilePolicy = Boolean(profileAssignment)
      }
    }

    results.push({
      id: row.id,
      policyId: row.policy_id,
      policyName,
      targetType: row.target_type as PolicyAssignmentTargetType,
      targetId: row.target_id,
      targetName:
        row.target_type === "device"
          ? (deviceNames.get(row.target_id) ?? "Device")
          : (profileNames.get(row.target_id) ?? "Profile"),
      precedence: row.precedence,
      syncStatus: row.sync_status as PolicyAssignmentListItem["syncStatus"],
      syncError: row.sync_error,
      overridesProfilePolicy,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })
  }

  return results
}

export async function createPolicyAssignment(input: {
  policyId: string
  targetType: PolicyAssignmentTargetType
  targetId: string
}): Promise<PolicyAssignmentListItem> {
  const userId = await requireAuthenticatedUserId()
  const admin = createAdminClient()

  const { data: policy } = await admin
    .from("tenant_gateway_policies")
    .select("id, name")
    .eq("id", input.policyId)
    .eq("user_id", userId)
    .neq("status", "deleted")
    .maybeSingle()
  if (!policy) throw new Error("Policy not found")

  if (input.targetType === "device") {
    const { data: device } = await admin
      .from("tenant_device_metadata")
      .select("id")
      .eq("id", input.targetId)
      .eq("user_id", userId)
      .maybeSingle()
    if (!device) throw new Error("Device not found")
  } else {
    const { data: profile } = await admin
      .from("tenant_device_profiles")
      .select("id")
      .eq("id", input.targetId)
      .eq("user_id", userId)
      .maybeSingle()
    if (!profile) throw new Error("Profile not found")
  }

  // One assignment per target (device or profile) — replace prior policy.
  const { data: previous } = await admin
    .from("tenant_policy_assignments")
    .select("id, policy_id")
    .eq("user_id", userId)
    .eq("target_type", input.targetType)
    .eq("target_id", input.targetId)
    .maybeSingle()

  if (previous) {
    await admin
      .from("tenant_policy_assignments")
      .delete()
      .eq("id", previous.id)
      .eq("user_id", userId)
  }

  const precedence =
    input.targetType === "device"
      ? DEVICE_ASSIGNMENT_PRECEDENCE_BASE
      : PROFILE_ASSIGNMENT_PRECEDENCE_BASE

  const { data: created, error } = await admin
    .from("tenant_policy_assignments")
    .insert({
      user_id: userId,
      policy_id: input.policyId,
      target_type: input.targetType,
      target_id: input.targetId,
      precedence,
      sync_status: "pending",
    })
    .select(
      "id, policy_id, target_type, target_id, precedence, sync_status, sync_error, created_at, updated_at"
    )
    .single()

  if (error) throw error

  const policiesToSync = new Set<string>([input.policyId])
  if (previous?.policy_id) policiesToSync.add(previous.policy_id)

  let syncFailedMessage: string | null = null
  for (const policyId of policiesToSync) {
    const result = await syncPolicyCloudflareEnforcement(userId, policyId)
    if (result.syncStatus === "sync_failed") {
      syncFailedMessage = result.error ?? "Cloudflare sync failed"
    }
  }

  if (syncFailedMessage) {
    throw new Error(syncFailedMessage)
  }

  const listed = await listPolicyAssignments()
  const item = listed.find((row) => row.id === created.id)
  if (!item) throw new Error("Assignment created but not readable")
  return item
}

export async function deletePolicyAssignment(
  assignmentId: string
): Promise<void> {
  const userId = await requireAuthenticatedUserId()
  const admin = createAdminClient()

  const { data: existing } = await admin
    .from("tenant_policy_assignments")
    .select("id, policy_id")
    .eq("id", assignmentId)
    .eq("user_id", userId)
    .maybeSingle()

  if (!existing) throw new Error("Assignment not found")

  const { error } = await admin
    .from("tenant_policy_assignments")
    .delete()
    .eq("id", assignmentId)
    .eq("user_id", userId)

  if (error) throw error

  const result = await syncPolicyCloudflareEnforcement(
    userId,
    existing.policy_id
  )
  if (result.syncStatus === "sync_failed") {
    throw new Error(result.error ?? "Cloudflare sync failed after unassign")
  }
}
