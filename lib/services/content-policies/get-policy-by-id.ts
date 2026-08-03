import { getPolicies } from "@/lib/services/content-policies/get-policies"
import type { PolicyListItem } from "@/schemas/content-policies/policy"

export async function getPolicyById(
  id: string
): Promise<PolicyListItem | null> {
  const policies = await getPolicies()
  return policies.find((policy) => policy.id === id) ?? null
}
