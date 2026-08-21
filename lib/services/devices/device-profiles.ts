import { createAdminClient } from "@/lib/supabase/admin"
import { requireAuthenticatedUserId } from "@/lib/services/devices/context"
import { createPolicyAssignment } from "@/lib/services/policy-assignments/policy-assignments"
import { syncPolicyCloudflareEnforcement } from "@/lib/services/policy-assignments/sync-policy-enforcement"
import type { DeviceProfileCreateInput } from "@/schemas/devices/profiles"

export type DeviceProfileListItem = {
  id: string
  name: string
  description: string | null
  deviceIds: string[]
  policyId: string | null
  policyName: string | null
  createdAt: string
  updatedAt: string
}

function isMissingSchemaError(error: {
  code?: string
  message?: string
}): boolean {
  return (
    error.code === "PGRST205" ||
    error.code === "42703" ||
    error.code === "42P01" ||
    (error.message?.includes("schema cache") ?? false) ||
    (error.message?.includes("does not exist") ?? false)
  )
}

export async function listDeviceProfiles(): Promise<DeviceProfileListItem[]> {
  const userId = await requireAuthenticatedUserId()
  const admin = createAdminClient()

  const { data: profiles, error } = await admin
    .from("tenant_device_profiles")
    .select("id, name, description, created_at, updated_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) {
    if (isMissingSchemaError(error)) {
      return []
    }
    throw error
  }

  const profileIds = (profiles ?? []).map((p) => p.id)
  if (profileIds.length === 0) return []

  const { data: members } = await admin
    .from("tenant_device_profile_members")
    .select("profile_id, device_id")
    .in("profile_id", profileIds)

  const { data: assignments } = await admin
    .from("tenant_policy_assignments")
    .select("target_id, policy_id, tenant_gateway_policies(id, name, status)")
    .eq("user_id", userId)
    .eq("target_type", "profile")
    .in("target_id", profileIds)

  const devicesByProfile = new Map<string, string[]>()
  for (const member of members ?? []) {
    const list = devicesByProfile.get(member.profile_id) ?? []
    list.push(member.device_id)
    devicesByProfile.set(member.profile_id, list)
  }

  const policyByProfile = new Map<
    string,
    { id: string; name: string }
  >()
  for (const row of assignments ?? []) {
    const policy = row.tenant_gateway_policies
    if (
      policy &&
      typeof policy === "object" &&
      !Array.isArray(policy) &&
      "id" in policy &&
      "name" in policy &&
      (policy as { status?: string }).status !== "deleted"
    ) {
      policyByProfile.set(row.target_id, {
        id: String((policy as { id: string }).id),
        name: String((policy as { name: string }).name),
      })
    }
  }

  return (profiles ?? []).map((profile) => {
    const policy = policyByProfile.get(profile.id)
    return {
      id: profile.id,
      name: profile.name,
      description: profile.description,
      deviceIds: devicesByProfile.get(profile.id) ?? [],
      policyId: policy?.id ?? null,
      policyName: policy?.name ?? null,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at,
    }
  })
}

export async function createDeviceProfile(
  input: DeviceProfileCreateInput
): Promise<DeviceProfileListItem> {
  const userId = await requireAuthenticatedUserId()
  const admin = createAdminClient()
  const name = input.name.trim()
  if (!name) throw new Error("Profile name is required")

  const { data, error } = await admin
    .from("tenant_device_profiles")
    .insert({
      user_id: userId,
      name,
      description: input.description?.trim() || null,
    })
    .select("id, name, description, created_at, updated_at")
    .single()

  if (error) {
    if (isMissingSchemaError(error)) {
      throw new Error(
        "Device profiles are unavailable. Apply migration 20260820160000_device_profiles_and_policy_assignments (npm run db:push) first."
      )
    }
    if (error.code === "23505") {
      throw new Error("A profile with that name already exists")
    }
    throw error
  }

  try {
    await addDeviceToProfile(data.id, input.deviceId)
    await createPolicyAssignment({
      policyId: input.policyId,
      targetType: "profile",
      targetId: data.id,
    })
  } catch (assignError) {
    await deleteDeviceProfile(data.id).catch(() => undefined)
    throw assignError
  }

  const profiles = await listDeviceProfiles()
  const created = profiles.find((profile) => profile.id === data.id)
  if (!created) throw new Error("Profile created but not readable")
  return created
}

export async function updateDeviceProfile(
  profileId: string,
  input: DeviceProfileCreateInput
): Promise<DeviceProfileListItem> {
  const userId = await requireAuthenticatedUserId()
  const admin = createAdminClient()
  const name = input.name.trim()
  if (!name) throw new Error("Profile name is required")

  const { error } = await admin
    .from("tenant_device_profiles")
    .update({
      name,
      description: input.description?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", profileId)
    .eq("user_id", userId)

  if (error) {
    if (error.code === "23505") {
      throw new Error("A profile with that name already exists")
    }
    throw error
  }

  await addDeviceToProfile(profileId, input.deviceId)
  await createPolicyAssignment({
    policyId: input.policyId,
    targetType: "profile",
    targetId: profileId,
  })

  const profiles = await listDeviceProfiles()
  const updated = profiles.find((profile) => profile.id === profileId)
  if (!updated) throw new Error("Profile not found")
  return updated
}

export type DeviceProfileDeleteResult = {
  id: string
  deviceIds: string[]
}

export async function deleteDeviceProfile(
  profileId: string
): Promise<DeviceProfileDeleteResult> {
  const userId = await requireAuthenticatedUserId()
  const admin = createAdminClient()

  const { data: profile } = await admin
    .from("tenant_device_profiles")
    .select("id")
    .eq("id", profileId)
    .eq("user_id", userId)
    .maybeSingle()
  if (!profile) throw new Error("Profile not found")

  const { data: members } = await admin
    .from("tenant_device_profile_members")
    .select("device_id")
    .eq("profile_id", profileId)

  const deviceIds = (members ?? []).map((member) => member.device_id)

  const { data: assignment } = await admin
    .from("tenant_policy_assignments")
    .select("policy_id")
    .eq("user_id", userId)
    .eq("target_type", "profile")
    .eq("target_id", profileId)
    .maybeSingle()

  const { error } = await admin
    .from("tenant_device_profiles")
    .delete()
    .eq("id", profileId)
    .eq("user_id", userId)

  if (error) throw error

  if (assignment?.policy_id) {
    await syncPolicyCloudflareEnforcement(userId, assignment.policy_id)
  }

  return { id: profileId, deviceIds }
}

export async function addDeviceToProfile(
  profileId: string,
  deviceId: string
): Promise<void> {
  const userId = await requireAuthenticatedUserId()
  const admin = createAdminClient()

  const { data: profile } = await admin
    .from("tenant_device_profiles")
    .select("id")
    .eq("id", profileId)
    .eq("user_id", userId)
    .maybeSingle()
  if (!profile) throw new Error("Profile not found")

  const { data: device } = await admin
    .from("tenant_device_metadata")
    .select("id")
    .eq("id", deviceId)
    .eq("user_id", userId)
    .maybeSingle()
  if (!device) throw new Error("Device not found")

  // Collect policies that may need resync (old profile + new profile)
  const { data: previousMembership } = await admin
    .from("tenant_device_profile_members")
    .select("profile_id")
    .eq("device_id", deviceId)
    .maybeSingle()

  await admin
    .from("tenant_device_profile_members")
    .delete()
    .eq("device_id", deviceId)

  const { error } = await admin.from("tenant_device_profile_members").insert({
    profile_id: profileId,
    device_id: deviceId,
  })
  if (error) throw error

  const policyIds = new Set<string>()
  for (const pid of [previousMembership?.profile_id, profileId]) {
    if (!pid) continue
    const { data: assignment } = await admin
      .from("tenant_policy_assignments")
      .select("policy_id")
      .eq("user_id", userId)
      .eq("target_type", "profile")
      .eq("target_id", pid)
      .maybeSingle()
    if (assignment?.policy_id) policyIds.add(assignment.policy_id)
  }

  for (const policyId of policyIds) {
    await syncPolicyCloudflareEnforcement(userId, policyId)
  }
}

export async function removeDeviceFromProfile(
  profileId: string,
  deviceId: string
): Promise<void> {
  const userId = await requireAuthenticatedUserId()
  const admin = createAdminClient()

  const { data: profile } = await admin
    .from("tenant_device_profiles")
    .select("id")
    .eq("id", profileId)
    .eq("user_id", userId)
    .maybeSingle()
  if (!profile) throw new Error("Profile not found")

  const { error } = await admin
    .from("tenant_device_profile_members")
    .delete()
    .eq("profile_id", profileId)
    .eq("device_id", deviceId)

  if (error) throw error

  const { data: assignment } = await admin
    .from("tenant_policy_assignments")
    .select("policy_id")
    .eq("user_id", userId)
    .eq("target_type", "profile")
    .eq("target_id", profileId)
    .maybeSingle()

  if (assignment?.policy_id) {
    await syncPolicyCloudflareEnforcement(userId, assignment.policy_id)
  }
}

/** Used by list devices enrichment — no auth re-check beyond userId. */
export async function getDeviceProfileMap(
  userId: string
): Promise<Map<string, { id: string; name: string }>> {
  const admin = createAdminClient()
  const { data: profiles, error } = await admin
    .from("tenant_device_profiles")
    .select("id, name")
    .eq("user_id", userId)

  const map = new Map<string, { id: string; name: string }>()
  if (error) {
    if (isMissingSchemaError(error)) return map
    throw error
  }
  if (!profiles?.length) return map

  const profileName = new Map(
    profiles.map((p) => [p.id, p.name] as const)
  )

  const { data: members, error: membersError } = await admin
    .from("tenant_device_profile_members")
    .select("device_id, profile_id")
    .in(
      "profile_id",
      profiles.map((p) => p.id)
    )

  if (membersError) {
    if (isMissingSchemaError(membersError)) return map
    throw membersError
  }

  for (const member of members ?? []) {
    const name = profileName.get(member.profile_id)
    if (!name) continue
    map.set(member.device_id, { id: member.profile_id, name })
  }
  return map
}
