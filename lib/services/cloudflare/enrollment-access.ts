import { CloudflareApiError, cloudflareRequest } from "@/lib/cloudflare/client"
import {
  getCloudflareAccountId,
  getCloudflareGatewayAuth,
  tryGetCloudflareWarpAppId,
} from "@/lib/cloudflare/config"

const SAAS_ENROLLMENT_POLICY_NAME = "RealLife OS SaaS device enrollment"
const OTP_PROVIDER_NAME = "One-time PIN login"

type AccessApplication = {
  id?: string
  name?: string
  type?: string
  allowed_idps?: string[] | null
  auto_redirect_to_identity?: boolean
  app_launcher_visible?: boolean
  session_duration?: string
  policies?: unknown
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

type IdentityProvider = {
  id?: string
  name?: string
  type?: string
}

function gatewayAuth() {
  return getCloudflareGatewayAuth()
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function emailFromRule(rule: AccessPolicyRule): string | null {
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

export function ruleAllowsEmail(rule: AccessPolicyRule, email: string): boolean {
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

export function mergeEmailIncludeRules(
  include: AccessPolicyRule[],
  email: string
): AccessPolicyRule[] {
  return [
    ...include.filter((rule) => emailFromRule(rule) !== email),
    { email: { email } },
  ]
}

export function selectWarpEnrollmentApp(
  apps: AccessApplication[],
  configuredWarpAppId?: string
): AccessApplication {
  const warpApps = apps.filter((app) => app.type === "warp" && app.id)

  if (configuredWarpAppId) {
    const configured = warpApps.find((app) => app.id === configuredWarpAppId)
    if (configured) return configured
  }

  if (warpApps.length === 1) return warpApps[0]
  if (warpApps.length > 1) {
    const named = warpApps.find((app) =>
      /enrollment|warp|device/i.test(app.name ?? "")
    )
    return named ?? warpApps[0]
  }

  throw new Error(
    "No Cloudflare WARP enrollment application was found. In Zero Trust open Devices → Device profiles → Management → Device enrollment permissions and create enrollment."
  )
}

export function buildWarpLoginMethods(
  otpProviderId: string,
  currentAllowedIdps: string[] | null | undefined
): { allowedIdps: string[]; autoRedirectToIdentity: boolean } {
  const current = (currentAllowedIdps ?? []).filter((id) => id.length > 0)
  const allowedIdps = current.includes(otpProviderId)
    ? current
    : current.length === 0
      ? [otpProviderId]
      : [...current, otpProviderId]

  return {
    allowedIdps,
    autoRedirectToIdentity:
      allowedIdps.length === 1 && allowedIdps[0] === otpProviderId,
  }
}

function attachedPolicyRefs(
  app: AccessApplication
): Array<{ id: string; precedence: number }> {
  const policies = app.policies
  if (!Array.isArray(policies)) return []

  const refs: Array<{ id: string; precedence: number }> = []
  for (const [index, policy] of policies.entries()) {
    if (typeof policy === "string" && policy.length > 0) {
      refs.push({ id: policy, precedence: index + 1 })
      continue
    }
    if (
      policy &&
      typeof policy === "object" &&
      "id" in policy &&
      typeof (policy as { id?: unknown }).id === "string"
    ) {
      const precedence =
        "precedence" in policy &&
        typeof (policy as { precedence?: unknown }).precedence === "number"
          ? (policy as { precedence: number }).precedence
          : index + 1
      refs.push({ id: (policy as { id: string }).id, precedence })
    }
  }
  return refs
}

async function listAccessApplications(
  accountId: string
): Promise<AccessApplication[]> {
  const apps: AccessApplication[] = []
  for (let page = 1; page <= 20; page += 1) {
    const batch = await cloudflareRequest<AccessApplication[]>({
      method: "GET",
      path: `/accounts/${accountId}/access/apps`,
      auth: gatewayAuth(),
      searchParams: { page, per_page: 100 },
    })
    const rows = Array.isArray(batch) ? batch : []
    apps.push(...rows)
    if (rows.length < 100) break
  }
  return apps
}

async function getAccessApplication(
  accountId: string,
  appId: string
): Promise<AccessApplication> {
  return cloudflareRequest<AccessApplication>({
    method: "GET",
    path: `/accounts/${accountId}/access/apps/${appId}`,
    auth: gatewayAuth(),
  })
}

async function resolveWarpEnrollmentApp(
  accountId: string
): Promise<AccessApplication> {
  const apps = await listAccessApplications(accountId)
  const selected = selectWarpEnrollmentApp(apps, tryGetCloudflareWarpAppId())
  if (!selected.id) {
    throw new Error("Cloudflare WARP enrollment application is missing an id.")
  }
  return getAccessApplication(accountId, selected.id)
}

async function listIdentityProviders(
  accountId: string
): Promise<IdentityProvider[]> {
  const result = await cloudflareRequest<IdentityProvider[]>({
    method: "GET",
    path: `/accounts/${accountId}/access/identity_providers`,
    auth: gatewayAuth(),
  })
  return Array.isArray(result) ? result : []
}

async function createOtpIdentityProvider(
  accountId: string
): Promise<IdentityProvider> {
  try {
    return await cloudflareRequest<IdentityProvider>({
      method: "POST",
      path: `/accounts/${accountId}/access/identity_providers`,
      auth: gatewayAuth(),
      body: {
        name: OTP_PROVIDER_NAME,
        type: "onetimepin",
        config: {},
      },
    })
  } catch (error) {
    if (error instanceof CloudflareApiError && error.status === 403) {
      throw new Error(
        "Cloudflare API token needs Access: Organizations, Identity Providers, and Groups Write so One-Time PIN can be enabled for device enrollment."
      )
    }
    throw error
  }
}

async function getOrCreateOtpProviderId(accountId: string): Promise<string> {
  const providers = await listIdentityProviders(accountId)
  const existing = providers.find(
    (provider) => provider.type === "onetimepin" && provider.id
  )
  if (existing?.id) return existing.id

  const created = await createOtpIdentityProvider(accountId)
  if (!created.id) {
    throw new Error("Cloudflare created a One-Time PIN provider without an id.")
  }
  return created.id
}

async function ensureWarpAppUsesOtp(
  accountId: string,
  app: AccessApplication,
  otpProviderId: string
): Promise<void> {
  if (!app.id) {
    throw new Error("Cloudflare WARP enrollment application is missing an id.")
  }

  const next = buildWarpLoginMethods(otpProviderId, app.allowed_idps)
  const currentIds = app.allowed_idps ?? []
  const sameIdps =
    currentIds.length === next.allowedIdps.length &&
    next.allowedIdps.every((id) => currentIds.includes(id))
  const sameRedirect =
    Boolean(app.auto_redirect_to_identity) === next.autoRedirectToIdentity

  if (sameIdps && sameRedirect && currentIds.length > 0) return

  const policyRefs = attachedPolicyRefs(app)

  try {
    await cloudflareRequest<AccessApplication>({
      method: "PUT",
      path: `/accounts/${accountId}/access/apps/${app.id}`,
      auth: gatewayAuth(),
      body: {
        name: app.name ?? "Warp",
        type: "warp",
        allowed_idps: next.allowedIdps,
        auto_redirect_to_identity: next.autoRedirectToIdentity,
        app_launcher_visible: app.app_launcher_visible ?? false,
        ...(policyRefs.length > 0 ? { policies: policyRefs } : {}),
      },
    })
  } catch (error) {
    if (error instanceof CloudflareApiError && error.status === 403) {
      throw new Error(
        "Cloudflare API token needs Access: Apps and Policies Write to enable One-Time PIN on WARP enrollment."
      )
    }
    throw error
  }
}

async function listAppPolicies(
  accountId: string,
  appId: string
): Promise<AccessAppPolicy[]> {
  const result = await cloudflareRequest<AccessAppPolicy[]>({
    method: "GET",
    path: `/accounts/${accountId}/access/apps/${appId}/policies`,
    auth: gatewayAuth(),
  })
  return Array.isArray(result) ? result : []
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
    auth: gatewayAuth(),
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
    auth: gatewayAuth(),
    body: policy,
  })
}

async function attachPolicyToWarpApp(
  accountId: string,
  appId: string,
  policyId: string
): Promise<void> {
  const app = await getAccessApplication(accountId, appId)
  const refs = attachedPolicyRefs(app)
  if (refs.some((ref) => ref.id === policyId)) return

  const nextRefs = [...refs, { id: policyId, precedence: refs.length + 1 }]
  const login = app.allowed_idps?.length
    ? {
        allowed_idps: app.allowed_idps,
        auto_redirect_to_identity: Boolean(app.auto_redirect_to_identity),
      }
    : {}

  await cloudflareRequest<AccessApplication>({
    method: "PUT",
    path: `/accounts/${accountId}/access/apps/${appId}`,
    auth: gatewayAuth(),
    body: {
      name: app.name ?? "Warp",
      type: "warp",
      app_launcher_visible: app.app_launcher_visible ?? false,
      ...login,
      policies: nextRefs,
    },
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
  const app = await resolveWarpEnrollmentApp(accountId)
  if (!app.id) {
    throw new Error("Cloudflare WARP enrollment application is missing an id.")
  }

  const otpProviderId = await getOrCreateOtpProviderId(accountId)
  await ensureWarpAppUsesOtp(accountId, app, otpProviderId)

  const policies = await listAppPolicies(accountId, app.id)
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
    const created = await createAppPolicy(accountId, app.id, {
      name: SAAS_ENROLLMENT_POLICY_NAME,
      decision: "allow",
      include: [{ email: { email } }],
    })
    if (created.id) {
      await attachPolicyToWarpApp(accountId, app.id, created.id)
    }
    return { email, createdPolicy: true, alreadyAllowed: false }
  }

  await updateAppPolicy(accountId, app.id, managed.id, {
    name: managed.name ?? SAAS_ENROLLMENT_POLICY_NAME,
    decision: "allow",
    include: mergeEmailIncludeRules(managed.include ?? [], email),
    require: managed.require,
    exclude: managed.exclude,
  })
  await attachPolicyToWarpApp(accountId, app.id, managed.id)

  return { email, createdPolicy: false, alreadyAllowed: false }
}
