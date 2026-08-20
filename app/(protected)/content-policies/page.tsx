import { PoliciesPage } from "@/app/(protected)/content-policies/_components/page-content"
import {
  parsePolicyStatusFilters,
  parsePolicyTypeFilters,
} from "@/lib/content-policies/list-params"
import { listGatewayPolicies } from "@/lib/services/content-policies/gateway-policies"

interface ContentPoliciesPageProps {
  searchParams: Promise<{ q?: string; status?: string; type?: string }>
}

export default async function ContentPoliciesPage({
  searchParams,
}: ContentPoliciesPageProps) {
  const { q = "", status, type } = await searchParams
  const statusFilters = parsePolicyStatusFilters(status)
  const typeFilters = parsePolicyTypeFilters(type)

  let policies: Awaited<ReturnType<typeof listGatewayPolicies>> = []
  try {
    policies = await listGatewayPolicies({
      query: q,
      statuses: statusFilters,
      types: typeFilters,
    })
  } catch (error) {
    console.error("Failed to load gateway policies on server:", error)
  }

  return (
    <PoliciesPage
      initialPolicies={policies}
      searchQuery={q}
      statusFilters={statusFilters}
      typeFilters={typeFilters}
    />
  )
}
