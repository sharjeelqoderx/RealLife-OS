import { createAdminClient } from "@/lib/supabase/admin"
import { deletePhysicalDevice } from "@/lib/services/cloudflare/devices"
import {
  DeviceServiceError,
  getDeviceAccountContext,
  requireAuthenticatedUserId,
} from "@/lib/services/devices/context"

export async function removeConnectedDevice(
  deviceId: string
): Promise<void> {
  const userId = await requireAuthenticatedUserId()
  const { accountId } = await getDeviceAccountContext(userId)
  const admin = createAdminClient()

  const { data: owned, error: ownershipError } = await admin
    .from("tenant_device_metadata")
    .select("cloudflare_device_id, cloudflare_location_id")
    .eq("id", deviceId)
    .eq("user_id", userId)
    .maybeSingle()
  if (ownershipError || !owned) {
    throw new DeviceServiceError("Device not found", 404, "NOT_FOUND")
  }

  try {
    await deletePhysicalDevice(accountId, owned.cloudflare_device_id)
  } catch (error) {
    console.error("removeConnectedDevice: delete failed:", error)
    throw new DeviceServiceError(
      "Unable to remove device.",
      502,
      "CLOUDFLARE_DELETE_FAILED"
    )
  }

  const { deleteDeviceDnsLocation } = await import(
    "@/lib/services/devices/device-dns-location"
  )
  await deleteDeviceDnsLocation({
    accountId,
    locationId: owned.cloudflare_location_id,
  })

  // Resync policies that referenced this device (assignments cascade via FK;
  // profile membership cascades; still refresh CF location sets).
  const { data: deviceAssignments } = await admin
    .from("tenant_policy_assignments")
    .select("policy_id")
    .eq("user_id", userId)
    .eq("target_type", "device")
    .eq("target_id", deviceId)

  const { data: membership } = await admin
    .from("tenant_device_profile_members")
    .select("profile_id")
    .eq("device_id", deviceId)
    .maybeSingle()

  let profilePolicyId: string | null = null
  if (membership?.profile_id) {
    const { data: profileAssignment } = await admin
      .from("tenant_policy_assignments")
      .select("policy_id")
      .eq("user_id", userId)
      .eq("target_type", "profile")
      .eq("target_id", membership.profile_id)
      .maybeSingle()
    profilePolicyId = profileAssignment?.policy_id ?? null
  }

  const { error } = await admin
    .from("tenant_device_metadata")
    .delete()
    .eq("user_id", userId)
    .eq("id", deviceId)

  if (error) {
    console.warn("removeConnectedDevice: metadata delete failed:", error.message)
  }

  const { syncPolicyCloudflareEnforcement } = await import(
    "@/lib/services/policy-assignments/sync-policy-enforcement"
  )
  const policyIds = new Set<string>()
  for (const row of deviceAssignments ?? []) {
    policyIds.add(row.policy_id)
  }
  if (profilePolicyId) policyIds.add(profilePolicyId)
  for (const policyId of policyIds) {
    await syncPolicyCloudflareEnforcement(userId, policyId)
  }

  const { error: auditError } = await admin.from("audit_log").insert({
    user_id: userId,
    action: "DEVICE_DELETED",
    resource_type: "device",
    resource_id: deviceId,
  })
  if (auditError) {
    console.error("removeConnectedDevice: audit log write failed")
  }
}
