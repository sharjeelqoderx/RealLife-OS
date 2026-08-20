import { createAdminClient } from "@/lib/supabase/admin"

export type EffectivePolicySource = "device" | "profile" | "none"

export type EffectivePolicyResult = {
  deviceId: string
  profile: { id: string; name: string } | null
  directPolicy: { id: string; name: string } | null
  effectivePolicy: { id: string; name: string } | null
  source: EffectivePolicySource
}

/**
 * Resolve the logical policy that should apply to a owned device.
 * Precedence: device assignment → profile assignment → none.
 */
export async function resolveEffectivePolicy(
  userId: string,
  deviceId: string
): Promise<EffectivePolicyResult> {
  const admin = createAdminClient()

  const { data: device, error: deviceError } = await admin
    .from("tenant_device_metadata")
    .select("id")
    .eq("id", deviceId)
    .eq("user_id", userId)
    .maybeSingle()

  if (deviceError) throw deviceError
  if (!device) {
    throw new Error("Device not found")
  }

  const empty: EffectivePolicyResult = {
    deviceId,
    profile: null,
    directPolicy: null,
    effectivePolicy: null,
    source: "none",
  }

  const { data: membership, error: membershipError } = await admin
    .from("tenant_device_profile_members")
    .select("profile_id, tenant_device_profiles(id, name)")
    .eq("device_id", deviceId)
    .maybeSingle()

  if (membershipError) {
    if (isMissingSchemaError(membershipError)) return empty
    throw membershipError
  }

  const profileRow = membership?.tenant_device_profiles
  const profile =
    profileRow &&
    typeof profileRow === "object" &&
    !Array.isArray(profileRow) &&
    "id" in profileRow &&
    "name" in profileRow
      ? {
          id: String((profileRow as { id: string }).id),
          name: String((profileRow as { name: string }).name),
        }
      : null

  const { data: directAssignment, error: directError } = await admin
    .from("tenant_policy_assignments")
    .select("policy_id, tenant_gateway_policies(id, name, status)")
    .eq("user_id", userId)
    .eq("target_type", "device")
    .eq("target_id", deviceId)
    .maybeSingle()

  if (directError) {
    if (isMissingSchemaError(directError)) return empty
    throw directError
  }

  const directPolicy = readPolicyRef(directAssignment?.tenant_gateway_policies)

  if (directPolicy) {
    return {
      deviceId,
      profile,
      directPolicy,
      effectivePolicy: directPolicy,
      source: "device",
    }
  }

  if (profile) {
    const { data: profileAssignment, error: profileAssignError } = await admin
      .from("tenant_policy_assignments")
      .select("policy_id, tenant_gateway_policies(id, name, status)")
      .eq("user_id", userId)
      .eq("target_type", "profile")
      .eq("target_id", profile.id)
      .maybeSingle()

    if (profileAssignError) {
      if (isMissingSchemaError(profileAssignError)) {
        return {
          deviceId,
          profile,
          directPolicy: null,
          effectivePolicy: null,
          source: "none",
        }
      }
      throw profileAssignError
    }

    const profilePolicy = readPolicyRef(
      profileAssignment?.tenant_gateway_policies
    )
    if (profilePolicy) {
      return {
        deviceId,
        profile,
        directPolicy: null,
        effectivePolicy: profilePolicy,
        source: "profile",
      }
    }
  }

  return {
    deviceId,
    profile,
    directPolicy: null,
    effectivePolicy: null,
    source: "none",
  }
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

function readPolicyRef(
  value: unknown
): { id: string; name: string } | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null
  }
  const row = value as { id?: string; name?: string; status?: string }
  if (!row.id || !row.name) return null
  if (row.status === "deleted") return null
  return { id: row.id, name: row.name }
}

/** Pure resolver for unit tests (no DB). */
export function resolveEffectivePolicyFromState(input: {
  deviceId: string
  profile: { id: string; name: string } | null
  devicePolicy: { id: string; name: string } | null
  profilePolicy: { id: string; name: string } | null
}): EffectivePolicyResult {
  if (input.devicePolicy) {
    return {
      deviceId: input.deviceId,
      profile: input.profile,
      directPolicy: input.devicePolicy,
      effectivePolicy: input.devicePolicy,
      source: "device",
    }
  }
  if (input.profile && input.profilePolicy) {
    return {
      deviceId: input.deviceId,
      profile: input.profile,
      directPolicy: null,
      effectivePolicy: input.profilePolicy,
      source: "profile",
    }
  }
  return {
    deviceId: input.deviceId,
    profile: input.profile,
    directPolicy: null,
    effectivePolicy: null,
    source: "none",
  }
}
