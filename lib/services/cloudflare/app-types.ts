import { cloudflareRequest } from "@/lib/cloudflare/client"
import { getCloudflareGatewayAuth } from "@/lib/cloudflare/config"
import type { PickerGroupDto } from "@/lib/services/cloudflare/category-picker"

/**
 * Cloudflare returns a mixed list of application types and applications.
 * Applications have `application_type_id`; types do not.
 * @see https://developers.cloudflare.com/api/resources/zero_trust/subresources/gateway/subresources/app_types/methods/list
 */
export type GatewayAppTypeEntry = {
  id?: number
  name?: string
  description?: string
  application_type_id?: number
  created_at?: string
}

export async function listGatewayAppTypes(
  accountId: string
): Promise<GatewayAppTypeEntry[]> {
  const result = await cloudflareRequest<GatewayAppTypeEntry[]>({
    method: "GET",
    path: `/accounts/${accountId}/gateway/app_types`,
    auth: getCloudflareGatewayAuth(),
  })
  return result ?? []
}

export function mapAppTypesToPickerGroups(
  entries: GatewayAppTypeEntry[]
): PickerGroupDto[] {
  const types = new Map<number, { name: string; description?: string }>()
  const apps: Array<{ id: number; name: string; typeId: number }> = []

  for (const entry of entries) {
    if (entry.id == null || !entry.name?.trim()) continue

    if (entry.application_type_id != null) {
      apps.push({
        id: entry.id,
        name: entry.name.trim(),
        typeId: entry.application_type_id,
      })
      continue
    }

    types.set(entry.id, {
      name: entry.name.trim(),
      description: entry.description,
    })
  }

  const byType = new Map<number, { id: string; label: string }[]>()
  for (const app of apps) {
    const list = byType.get(app.typeId) ?? []
    list.push({ id: String(app.id), label: app.name })
    byType.set(app.typeId, list)
  }

  const groups: PickerGroupDto[] = []

  for (const [typeId, items] of byType) {
    const typeMeta = types.get(typeId)
    const label = (typeMeta?.name ?? `App type ${typeId}`).toUpperCase()
    groups.push({
      id: `app-type-${typeId}`,
      label,
      items: items.sort((a, b) => a.label.localeCompare(b.label)),
    })
  }

  // Orphan type IDs still get a group via typeId fallback label above.

  if (groups.length === 0 && apps.length > 0) {
    groups.push({
      id: "app-all",
      label: "APPLICATIONS",
      items: apps
        .map((a) => ({ id: String(a.id), label: a.name }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    })
  }

  return groups.sort((a, b) => a.label.localeCompare(b.label))
}

export async function listGatewayAppPickerGroups(
  accountId: string
): Promise<PickerGroupDto[]> {
  const entries = await listGatewayAppTypes(accountId)
  return mapAppTypesToPickerGroups(entries)
}
