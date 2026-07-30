import { PoliciesPage } from "@/app/(protected)/content-policies/_components/page-content"
import { parsePolicyListParam } from "@/lib/content-policies/list-params"
import { listAccessPolicies } from "@/lib/services/content-policies/access-policies"
import type { PolicyStatus, PolicyType } from "@/schemas/content-policies/policy"

interface ContentPoliciesPageProps {
  searchParams: Promise<{ q?: string; status?: string; type?: string }>
}

export default async function ContentPoliciesPage({
  searchParams,
}: ContentPoliciesPageProps) {
  const { q = "", status, type } = await searchParams

  let allPolicies: Awaited<ReturnType<typeof listAccessPolicies>> = []
  try {
    allPolicies = await listAccessPolicies()
  } catch (error) {
    console.error("Failed to load access policies on server:", error)
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
