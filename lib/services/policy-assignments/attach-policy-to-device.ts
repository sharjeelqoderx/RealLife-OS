import { createAdminClient } from "@/lib/supabase/admin"
import { createPolicyAssignment } from "@/lib/services/policy-assignments/policy-assignments"

/** Attach the newest configured policy to a device that has none yet. */
export async function attachLatestConfiguredPolicyToDevice(
  userId: string,
  deviceMetadataId: string
): Promise<void> {
  const admin = createAdminClient()

  const { data: existing } = await admin
    .from("tenant_policy_assignments")
    .select("id")
    .eq("user_id", userId)
    .eq("target_type", "device")
    .eq("target_id", deviceMetadataId)
    .maybeSingle()
  if (existing) return

  const { data: membership } = await admin
    .from("tenant_device_profile_members")
    .select("profile_id")
    .eq("device_id", deviceMetadataId)
    .maybeSingle()
  if (membership?.profile_id) {
    const { data: profileAssignment } = await admin
      .from("tenant_policy_assignments")
      .select("id")
      .eq("user_id", userId)
      .eq("target_type", "profile")
      .eq("target_id", membership.profile_id)
      .maybeSingle()
    if (profileAssignment) return
  }

  const { data: policy } = await admin
    .from("tenant_gateway_policies")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "configured")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!policy?.id) return

  await createPolicyAssignment({
    policyId: policy.id,
    targetType: "device",
    targetId: deviceMetadataId,
  })
}
