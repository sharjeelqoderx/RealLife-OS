import { PoliciesPage } from "@/app/(protected)/content-policies/_components/page-content"
import { parsePolicyListParam } from "@/lib/content-policies/list-params"
import { listGatewayPolicies } from "@/lib/services/content-policies/gateway-policies"
import type { PolicyStatus, PolicyType } from "@/schemas/content-policies/policy"

interface ContentPoliciesPageProps {
  searchParams: Promise<{ q?: string; status?: string; type?: string }>
}

export default async function ContentPoliciesPage({
  searchParams,
}: ContentPoliciesPageProps) {
  const { q = "", status, type } = await searchParams

  let allPolicies: Awaited<ReturnType<typeof listGatewayPolicies>> = []
  try {
    allPolicies = await listGatewayPolicies()
  } catch (error) {
    console.error("Failed to load gateway policies on server:", error)
  }

  return (
    <PoliciesPage
      allPolicies={allPolicies}
      searchQuery={q}
      statusFilters={parsePolicyListParam(status) as PolicyStatus[]}
      typeFilters={parsePolicyListParam(type) as PolicyType[]}
    />
  )
}
