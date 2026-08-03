import { cloudflareRequest } from "@/lib/cloudflare/client"
import { getCloudflareGatewayAuth } from "@/lib/cloudflare/config"

export type GatewayCategory = {
  id?: number
  name?: string
  description?: string
  beta?: boolean
  class?: string
  subcategories?: GatewayCategory[]
}

/**
 * List Gateway content categories (80+).
 * @see https://developers.cloudflare.com/api/resources/zero_trust/subresources/gateway/subresources/categories/methods/list
 */
export async function listGatewayCategories(
  accountId: string
): Promise<GatewayCategory[]> {
  const result = await cloudflareRequest<GatewayCategory[]>({
    method: "GET",
    path: `/accounts/${accountId}/gateway/categories`,
    auth: getCloudflareGatewayAuth(),
  })
  return result ?? []
}

function flattenCategories(categories: GatewayCategory[]): GatewayCategory[] {
  const out: GatewayCategory[] = []
  for (const cat of categories) {
    out.push(cat)
    if (cat.subcategories?.length) {
      out.push(...flattenCategories(cat.subcategories))
    }
  }
  return out
}

/** Normalize for fuzzy name matching against UI labels. */
export function normalizeCategoryName(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

/**
 * Resolve UI category labels → Cloudflare numeric category IDs.
 */
export async function resolveCategoryIdsByLabels(
  accountId: string,
  labels: string[]
): Promise<number[]> {
  if (labels.length === 0) return []

  const categories = flattenCategories(await listGatewayCategories(accountId))
  const byName = new Map<string, number>()

  for (const cat of categories) {
    if (cat.id == null || !cat.name) continue
    byName.set(normalizeCategoryName(cat.name), cat.id)
  }

  const ids = new Set<number>()
  for (const label of labels) {
    const key = normalizeCategoryName(label)
    const exact = byName.get(key)
    if (exact != null) {
      ids.add(exact)
      continue
    }

    // Partial match: UI "Online Video (YouTube, TikTok...)" → CF "Online Video"
    for (const [name, id] of byName) {
      if (key.includes(name) || name.includes(key.split(" ")[0] ?? "")) {
        ids.add(id)
        break
      }
    }
  }

  return [...ids]
}
