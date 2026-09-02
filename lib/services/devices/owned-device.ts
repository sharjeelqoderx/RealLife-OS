import { createAdminClient } from "@/lib/supabase/admin"

/**
 * Public device IDs are tenant_device_metadata.id.
 * Enrollment IDs and Cloudflare physical-device IDs are accepted and mapped.
 */
export async function resolveOwnedDeviceMetadataId(
  userId: string,
  candidateId: string
): Promise<string | null> {
  const id = candidateId.trim()
  if (!id) return null
  const admin = createAdminClient()

  const { data: byMetadataId } = await admin
    .from("tenant_device_metadata")
    .select("id")
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle()
  if (byMetadataId?.id) return byMetadataId.id

  const { data: byCloudflareId } = await admin
    .from("tenant_device_metadata")
    .select("id")
    .eq("user_id", userId)
    .eq("cloudflare_device_id", id)
    .maybeSingle()
  if (byCloudflareId?.id) return byCloudflareId.id

  const { data: enrollment } = await admin
    .from("device_enrollments")
    .select("cloudflare_device_id")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle()

  const cloudflareDeviceId = enrollment?.cloudflare_device_id
  if (!cloudflareDeviceId) return null

  const { data: fromEnrollment } = await admin
    .from("tenant_device_metadata")
    .select("id")
    .eq("user_id", userId)
    .eq("cloudflare_device_id", cloudflareDeviceId)
    .maybeSingle()

  return fromEnrollment?.id ?? null
}
