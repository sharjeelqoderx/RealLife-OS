import type { QueryClient } from "@tanstack/react-query"

import { queryKeys } from "@/lib/query/keys"
import type { PolicyListItem } from "@/schemas/content-policies/policy"

export function upsertGatewayPolicyListCache(
  queryClient: QueryClient,
  listItem: PolicyListItem,
  mode: "create" | "edit"
) {
  queryClient.setQueriesData<PolicyListItem[]>(
    { queryKey: queryKeys.gatewayPolicies.list() },
    (current) => {
      const list = current ?? []

      if (mode === "edit") {
        const exists = list.some((policy) => policy.id === listItem.id)
        if (!exists) return [listItem, ...list]
        return list.map((policy) =>
          policy.id === listItem.id ? listItem : policy
        )
      }

      return [
        listItem,
        ...list.filter((policy) => policy.id !== listItem.id),
      ]
    }
  )
}

export function removeGatewayPolicyFromListCache(
  queryClient: QueryClient,
  policyId: string
) {
  queryClient.setQueriesData<PolicyListItem[]>(
    { queryKey: queryKeys.gatewayPolicies.list() },
    (current) => (current ?? []).filter((policy) => policy.id !== policyId)
  )
}
