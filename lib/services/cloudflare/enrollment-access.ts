import { cloudflareRequest } from "@/lib/cloudflare/client"
import {
  getCloudflareAccessAppId,
  getCloudflareAccountId,
  getCloudflareGatewayAuth,
  tryGetCloudflareAccessAppId,
} from "@/lib/cloudflare/config"

const SAAS_ENROLLMENT_POLICY_NAME = "RealLife OS SaaS device enrollment"

type AccessApplication = {
  id?: string
  name?: string
  type?: string
}

type AccessPolicyRule = Record<string, unknown>

type AccessAppPolicy = {
  id?: string
  name?: string
  decision?: string
  include?: AccessPolicyRule[]
  require?: AccessPolicyRule[]
  exclude?: AccessPolicyRule[]
  precedence?: number
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function emailFromRule(rule: AccessPolicyRule): string | null {
  const email = rule.email
  if (
    email &&
    typeof email === "object" &&
    email !== null &&
    "email" in email &&
    typeof (email as { email?: unknown }).email === "string"
  ) {
    return normalizeEmail((email as { email: string }).email)
  }
  return null
}

function ruleAllowsEmail(rule: AccessPolicyRule, email: string): boolean {
  if (emailFromRule(rule) === email) return true

  const domainRule = rule.email_domain
  if (
    domainRule &&
    typeof domainRule === "object" &&
    domainRule !== null &&
    "domain" in domainRule &&
    typeof (domainRule as { domain?: unknown }).domain === "string"
  ) {
    const domain = (domainRule as { domain: string }).domain
      .replace(/^@/, "")
      .toLowerCase()
    return email.endsWith(`@${domain}`)
  }

  if ("everyone" in rule) return true
  return false
}

async function listAccessApplications(
  accountId: string
): Promise<AccessApplication[]> {
  return cloudflareRequest<AccessApplication[]>({
    method: "GET",
    path: `/accounts/${accountId}/access/apps`,
    auth: getCloudflareGatewayAuth(),
  })
}

async function resolveWarpEnrollmentAppId(
  accountId: string
): Promise<string> {
  const configured = tryGetCloudflareAccessAppId()
  if (configured) return configured

  const apps = await listAccessApplications(accountId)
  const warp = apps.find((app) => app.type === "warp" && app.id)
  if (warp?.id) return warp.id

  return getCloudflareAccessAppId()
}

async function listAppPolicies(
  accountId: string,
  appId: string
): Promise<AccessAppPolicy[]> {
  return cloudflareRequest<AccessAppPolicy[]>({
    method: "GET",
    path: `/accounts/${accountId}/access/apps/${appId}/policies`,
    auth: getCloudflareGatewayAuth(),
  })
}

async function createAppPolicy(
  accountId: string,
  appId: string,
  policy: {
    name: string
    decision: "allow"
    include: AccessPolicyRule[]
    require?: AccessPolicyRule[]
    exclude?: AccessPolicyRule[]
  }
): Promise<AccessAppPolicy> {
  return cloudflareRequest<AccessAppPolicy>({
    method: "POST",
    path: `/accounts/${accountId}/access/apps/${appId}/policies`,
    auth: getCloudflareGatewayAuth(),
    body: policy,
  })
}

async function updateAppPolicy(
  accountId: string,
  appId: string,
  policyId: string,
  policy: {
    name: string
    decision: "allow"
    include: AccessPolicyRule[]
    require?: AccessPolicyRule[]
    exclude?: AccessPolicyRule[]
  }
): Promise<AccessAppPolicy> {
  return cloudflareRequest<AccessAppPolicy>({
    method: "PUT",
    path: `/accounts/${accountId}/access/apps/${appId}/policies/${policyId}`,
    auth: getCloudflareGatewayAuth(),
    body: policy,
  })
}

/**
 * Registers the authenticated SaaS email on the Cloudflare WARP enrollment
 * Access policy so One-Time PIN enrollment is allowed for that mailbox.
 */
export async function registerEnrollmentEmail(
  emailInput: string
): Promise<{ email: string; createdPolicy: boolean; alreadyAllowed: boolean }> {
  const email = normalizeEmail(emailInput)
  if (!email || !email.includes("@")) {
    throw new Error("A valid account email is required for device enrollment.")
  }

  const accountId = getCloudflareAccountId()
  const appId = await resolveWarpEnrollmentAppId(accountId)
  const policies = await listAppPolicies(accountId, appId)

  const alreadyAllowed = policies.some(
    (policy) =>
      policy.decision === "allow" &&
      (policy.include ?? []).some((rule) => ruleAllowsEmail(rule, email))
  )
  if (alreadyAllowed) {
    return { email, createdPolicy: false, alreadyAllowed: true }
  }

  const managed =
    policies.find(
      (policy) =>
        policy.id &&
        policy.name === SAAS_ENROLLMENT_POLICY_NAME &&
        policy.decision === "allow"
    ) ?? null

  if (!managed?.id) {
    await createAppPolicy(accountId, appId, {
      name: SAAS_ENROLLMENT_POLICY_NAME,
      decision: "allow",
      include: [{ email: { email } }],
    })
    return { email, createdPolicy: true, alreadyAllowed: false }
  }

  const existingInclude = managed.include ?? []
  const nextInclude = [
    ...existingInclude.filter((rule) => emailFromRule(rule) !== email),
    { email: { email } },
  ]

  await updateAppPolicy(accountId, appId, managed.id, {
    name: managed.name ?? SAAS_ENROLLMENT_POLICY_NAME,
    decision: "allow",
    include: nextInclude,
    require: managed.require,
    exclude: managed.exclude,
  })

  return { email, createdPolicy: false, alreadyAllowed: false }
}
