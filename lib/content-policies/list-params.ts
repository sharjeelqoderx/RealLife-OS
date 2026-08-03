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

export function readPolicyListParams() {
  const params = new URLSearchParams(window.location.search)

  return {
    q: params.get("q") ?? "",
    status: parsePolicyListParam(params.get("status") ?? undefined),
    type: parsePolicyListParam(params.get("type") ?? undefined),
  }
}
