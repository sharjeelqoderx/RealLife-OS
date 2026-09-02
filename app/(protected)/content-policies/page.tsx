import { PoliciesPage } from "@/app/(protected)/content-policies/_components/page-content"
import {
  parsePolicyStatusFilters,
  parsePolicyTypeFilters,
} from "@/lib/content-policies/list-params"

interface ContentPoliciesPageProps {
  searchParams: Promise<{ q?: string; status?: string; type?: string }>
}

export default async function ContentPoliciesPage({
  searchParams,
}: ContentPoliciesPageProps) {
  const { q = "", status, type } = await searchParams
  const statusFilters = parsePolicyStatusFilters(status)
  const typeFilters = parsePolicyTypeFilters(type)

  return (
    <PoliciesPage
      searchQuery={q}
      statusFilters={statusFilters}
      typeFilters={typeFilters}
    />
  )
}
