import type { GatewayCategory } from "@/lib/services/cloudflare/categories"
import { listGatewayCategories } from "@/lib/services/cloudflare/categories"

export type PickerGroupDto = {
  id: string
  label: string
  items: {
    id: string
    label: string
    description?: string
    keywords?: string
  }[]
}

/**
 * Map Cloudflare Gateway categories → picker groups (parent = group, children = items).
 * Parents without subcategories become a single-item group.
 */
export function mapCategoriesToPickerGroups(
  categories: GatewayCategory[]
): PickerGroupDto[] {
  const groups: PickerGroupDto[] = []

  for (const cat of categories) {
    const parentName = cat.name?.trim()
    if (!parentName) continue

    const groupId = `cat-group-${cat.id ?? slugify(parentName)}`
    const subs = cat.subcategories?.filter((s) => s.id != null && s.name) ?? []

    if (subs.length > 0) {
      groups.push({
        id: groupId,
        label: parentName.toUpperCase(),
        items: subs.map((sub) => ({
          id: String(sub.id),
          label: sub.name!.trim(),
        })),
      })
      continue
    }

    if (cat.id == null) continue
    groups.push({
      id: groupId,
      label: parentName.toUpperCase(),
      items: [{ id: String(cat.id), label: parentName }],
    })
  }

  return groups.sort((a, b) => a.label.localeCompare(b.label))
}

export async function listGatewayCategoryPickerGroups(
  accountId: string
): Promise<PickerGroupDto[]> {
  const categories = await listGatewayCategories(accountId)
  return mapCategoriesToPickerGroups(categories)
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}
