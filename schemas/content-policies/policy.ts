export type PolicyType = "allow" | "block" | "ytrestricted" | "safesearch"

export type PolicyStatus = "active" | "inactive"

export type PolicyListItem = {
  id: string
  name: string
  type: PolicyType
  typeLabel: string
  rulesCount: number
  status: PolicyStatus
  updatedAt: string
}

export type PolicyListResponse = PolicyListItem[]
