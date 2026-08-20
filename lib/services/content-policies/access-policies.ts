import type {
  AccessPolicyRuleInput,
  CreateAccessPolicyInput,
} from "@/schemas/content-policies/access-policy"
import type { PolicyListItem, PolicyType } from "@/schemas/content-policies/policy"

type CloudflareAccessRule =
  | { everyone: Record<string, never> }
  | { email: { email: string } }
  | { email_domain: { domain: string } }
  | { ip: { ip: string } }
  | { group: { id: string } }

export type CloudflareAccessPolicy = {
  id: string
  name: string
  decision: string
  include?: unknown[]
  require?: unknown[]
  exclude?: unknown[]
  updated_at?: string
  created_at?: string
}

function getCloudflareConfig() {
  const accountId = process.env.CLOUDFARE_ACCOUNT_ID
  const appId = process.env.CLOUDFARE_APP_ID
  const token = process.env.CLOUDFARE_API_TOKEN

  if (!accountId || !appId || !token) {
    throw new Error("Cloudflare Access credentials are not configured")
  }

  return { accountId, appId, token }
}

function policiesUrl(accountId: string, appId: string) {
  return `https://api.cloudflare.com/client/v4/accounts/${accountId}/access/apps/${appId}/policies`
}

function uniqueAccessPolicyName(displayName: string, now = new Date()): string {
  const stamp = now.toISOString().replace(/\.\d{3}Z$/, "Z")
  const suffix = ` · ${stamp}`
  const budget = Math.max(1, 100 - suffix.length)
  return `${displayName.trim().slice(0, budget)}${suffix}`
}

export function toCloudflareRule(
  rule: AccessPolicyRuleInput
): CloudflareAccessRule {
  switch (rule.selector) {
    case "everyone":
      return { everyone: {} }
    case "email":
      return { email: { email: rule.value } }
    case "email_domain":
      return { email_domain: { domain: rule.value.replace(/^@/, "") } }
    case "ip":
      return { ip: { ip: rule.value } }
    case "group":
      return { group: { id: rule.value } }
  }
}

function mapDecisionToType(decision: string): PolicyType {
  if (decision === "bypass") return "allow"
  if (decision === "deny") return "block"
  if (decision === "allow") return "allow"
  return "allow"
}

function formatDecisionLabel(decision: string): string {
  if (decision === "deny") return "Block"
  return decision.charAt(0).toUpperCase() + decision.slice(1)
}

export function mapCloudflarePolicyToListItem(
  policy: CloudflareAccessPolicy
): PolicyListItem {
  const includeCount = policy.include?.length ?? 0
  const requireCount = policy.require?.length ?? 0
  const excludeCount = policy.exclude?.length ?? 0
  const updatedAt = policy.updated_at ?? policy.created_at

  return {
    id: policy.id,
    name: policy.name,
    type: mapDecisionToType(policy.decision),
    typeLabel: formatDecisionLabel(policy.decision),
    rulesCount: includeCount + requireCount + excludeCount,
    status: "active",
    updatedAt: updatedAt
      ? new Date(updatedAt).toLocaleDateString()
      : "—",
  }
}

export async function listAccessPolicies(): Promise<PolicyListItem[]> {
  const { accountId, appId, token } = getCloudflareConfig()

  const res = await fetch(policiesUrl(accountId, appId), {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  })

  if (!res.ok) {
    const body = await res.text()
    console.error("Cloudflare list policies error:", res.status, body)
    throw new Error("Failed to fetch access policies")
  }

  const data = (await res.json()) as { result: CloudflareAccessPolicy[] }
  return (data.result ?? []).map(mapCloudflarePolicyToListItem)
}

export async function createAccessPolicy(
  input: CreateAccessPolicyInput
): Promise<CloudflareAccessPolicy> {
  const { accountId, appId, token } = getCloudflareConfig()

  const payload = {
    name: uniqueAccessPolicyName(input.name),
    decision: input.decision,
    include: input.include.map(toCloudflareRule),
    require: input.require.map(toCloudflareRule),
    exclude: input.exclude.map(toCloudflareRule),
  }

  const res = await fetch(policiesUrl(accountId, appId), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  const data = (await res.json()) as {
    success?: boolean
    result?: CloudflareAccessPolicy
    errors?: Array<{ message?: string }>
  }

  if (!res.ok || data.success === false) {
    const message =
      data.errors?.[0]?.message ?? "Failed to create access policy"
    console.error("Cloudflare create policy error:", res.status, data)
    throw new Error(message)
  }

  if (!data.result) {
    throw new Error("Failed to create access policy")
  }

  return data.result
}

export async function deleteAccessPolicy(policyId: string): Promise<void> {
  const { accountId, appId, token } = getCloudflareConfig()

  const res = await fetch(`${policiesUrl(accountId, appId)}/${policyId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  })

  const data = (await res.json().catch(() => ({}))) as {
    success?: boolean
    errors?: Array<{ message?: string }>
  }

  if (!res.ok || data.success === false) {
    const message =
      data.errors?.[0]?.message ?? "Failed to delete access policy"
    console.error("Cloudflare delete policy error:", res.status, data)
    throw new Error(message)
  }
}
