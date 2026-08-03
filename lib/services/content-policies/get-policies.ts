import type {
  PolicyListResponse,
  PolicyStatus,
  PolicyType,
} from "@/schemas/content-policies/policy"

export type PolicyListFilters = {
  query?: string
  statuses?: PolicyStatus[]
  types?: PolicyType[]
}

const MOCK_POLICIES: PolicyListResponse = [
  {
    id: "pol-001",
    name: "Whitelist",
    type: "allow",
    typeLabel: "ALLOW",
    rulesCount: 3,
    status: "active",
    updatedAt: "2 hours ago",
  },
  {
    id: "pol-002",
    name: "Blacklist",
    type: "block",
    typeLabel: "BLOCK",
    rulesCount: 5,
    status: "active",
    updatedAt: "1 day ago",
  },
  {
    id: "pol-003",
    name: "YouTube Restricted",
    type: "ytrestricted",
    typeLabel: "YT RESTRICTED",
    rulesCount: 1,
    status: "active",
    updatedAt: "3 days ago",
  },
  {
    id: "pol-004",
    name: "SafeSearch on Supported Search Engines",
    type: "safesearch",
    typeLabel: "SAFESEARCH",
    rulesCount: 1,
    status: "active",
    updatedAt: "1 week ago",
  },
  {
    id: "pol-005",
    name: "Social Media Block",
    type: "block",
    typeLabel: "BLOCK",
    rulesCount: 4,
    status: "inactive",
    updatedAt: "2 weeks ago",
  },
  {
    id: "pol-006",
    name: "Gaming Sites Allow",
    type: "allow",
    typeLabel: "ALLOW",
    rulesCount: 2,
    status: "active",
    updatedAt: "5 days ago",
  },
]

export async function getPolicies(): Promise<PolicyListResponse> {
  return MOCK_POLICIES
}

export function filterPolicies(
  policies: PolicyListResponse,
  filters: PolicyListFilters | string
): PolicyListResponse {
  const normalizedFilters: PolicyListFilters =
    typeof filters === "string" ? { query: filters } : filters

  const normalizedQuery = normalizedFilters.query?.trim().toLowerCase() ?? ""
  const statuses = normalizedFilters.statuses ?? []
  const types = normalizedFilters.types ?? []

  return policies.filter((policy) => {
    if (
      normalizedQuery &&
      !policy.name.toLowerCase().includes(normalizedQuery) &&
      !policy.typeLabel.toLowerCase().includes(normalizedQuery)
    ) {
      return false
    }

    if (statuses.length > 0 && !statuses.includes(policy.status)) {
      return false
    }

    if (types.length > 0 && !types.includes(policy.type)) {
      return false
    }

    return true
  })
}
