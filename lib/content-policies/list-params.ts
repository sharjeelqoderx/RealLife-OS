import type { PolicyStatus, PolicyType } from "@/schemas/content-policies/policy"

export const POLICY_STATUS_OPTIONS: {
  value: PolicyStatus
  label: string
}[] = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
]

export const POLICY_TYPE_OPTIONS: {
  value: PolicyType
  label: string
}[] = [
  { value: "allow", label: "Allow" },
  { value: "block", label: "Block" },
  { value: "ytrestricted", label: "YT Restricted" },
  { value: "safesearch", label: "SafeSearch" },
]

const POLICY_STATUS_VALUES = new Set<PolicyStatus>(
  POLICY_STATUS_OPTIONS.map((option) => option.value)
)

const POLICY_TYPE_VALUES = new Set<PolicyType>(
  POLICY_TYPE_OPTIONS.map((option) => option.value)
)

export type PolicyListQueryFilters = {
  q: string
  status: PolicyStatus[]
  type: PolicyType[]
}

export function parsePolicyListParam(value: string | undefined): string[] {
  if (!value?.trim()) return []
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
}

export function serializePolicyListParam(values: string[]): string | undefined {
  return values.length > 0 ? values.join(",") : undefined
}

export function parsePolicyStatusFilters(
  value: string | undefined
): PolicyStatus[] {
  return parsePolicyListParam(value).filter((entry): entry is PolicyStatus =>
    POLICY_STATUS_VALUES.has(entry as PolicyStatus)
  )
}

export function parsePolicyTypeFilters(value: string | undefined): PolicyType[] {
  return parsePolicyListParam(value).filter((entry): entry is PolicyType =>
    POLICY_TYPE_VALUES.has(entry as PolicyType)
  )
}

export function normalizePolicyListFilters(input: {
  q?: string
  status?: PolicyStatus[]
  type?: PolicyType[]
}): PolicyListQueryFilters {
  return {
    q: input.q?.trim() ?? "",
    status: [...(input.status ?? [])].sort(),
    type: [...(input.type ?? [])].sort(),
  }
}

export function buildGatewayPoliciesListPath(
  filters: PolicyListQueryFilters
): string {
  const params = new URLSearchParams()
  const query = filters.q.trim()

  if (query) {
    params.set("q", query)
  }

  const status = serializePolicyListParam(filters.status)
  if (status) {
    params.set("status", status)
  }

  const type = serializePolicyListParam(filters.type)
  if (type) {
    params.set("type", type)
  }

  const search = params.toString()
  return search ? `/api/gateway-policies?${search}` : "/api/gateway-policies"
}

export function updatePolicyListUrlParam(
  key: "q" | "status" | "type",
  value: string | undefined
) {
  const params = new URLSearchParams(window.location.search)

  if (value) {
    params.set(key, value)
  } else {
    params.delete(key)
  }

  const nextSearch = params.toString()
  const currentSearch = window.location.search.replace(/^\?/, "")

  if (nextSearch === currentSearch) {
    return
  }

  const pathname = window.location.pathname
  const nextUrl = nextSearch ? `${pathname}?${nextSearch}` : pathname
  window.history.replaceState(null, "", nextUrl)
}

export function readPolicyListParams(): PolicyListQueryFilters {
  const params = new URLSearchParams(window.location.search)

  return {
    q: params.get("q") ?? "",
    status: parsePolicyStatusFilters(params.get("status") ?? undefined),
    type: parsePolicyTypeFilters(params.get("type") ?? undefined),
  }
}
