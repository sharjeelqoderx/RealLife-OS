/**
 * Cloudflare env helpers.
 * Existing Access integration uses the historical `CLOUDFARE_*` misspelling —
 * both `CLOUDFARE_*` and `CLOUDFLARE_*` are accepted.
 */

function firstEnv(...names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name]
    if (value) return value
  }
  return undefined
}

function requireFirstEnv(...names: string[]): string {
  const value = firstEnv(...names)
  if (!value) {
    throw new Error(
      `Missing required environment variable (tried: ${names.join(", ")})`
    )
  }
  return value
}

export type CloudflareApiTokenAuth = {
  mode: "apiToken"
  token: string
}

export type CloudflareTenantAdminAuth = {
  mode: "tenantAdmin"
  email: string
  apiKey: string
}

export type CloudflareAuth = CloudflareApiTokenAuth | CloudflareTenantAdminAuth

/** Bearer token used for Access / Gateway operations. */
export function getCloudflareApiToken(): string {
  return requireFirstEnv("CLOUDFARE_API_TOKEN", "CLOUDFLARE_API_TOKEN")
}

/** Default (platform) Cloudflare account — used when not provisioning children. */
export function getCloudflareAccountId(): string {
  return requireFirstEnv("CLOUDFARE_ACCOUNT_ID", "CLOUDFLARE_ACCOUNT_ID")
}

/** Optional read — does not throw when unset. */
export function tryGetCloudflareAccountId(): string | undefined {
  return firstEnv("CLOUDFARE_ACCOUNT_ID", "CLOUDFLARE_ACCOUNT_ID")
}

export function tryGetCloudflareApiToken(): string | undefined {
  return firstEnv("CLOUDFARE_API_TOKEN", "CLOUDFLARE_API_TOKEN")
}

/**
 * Shared Zero Trust (Model B): one platform account for every RealLife user.
 * Ready when account id + API token are present — no per-user child tenant.
 */
export function hasCloudflarePlatformConfig(): boolean {
  return Boolean(tryGetCloudflareAccountId() && tryGetCloudflareApiToken())
}

export function getCloudflareAccessAppId(): string {
  return requireFirstEnv("CLOUDFARE_APP_ID", "CLOUDFLARE_APP_ID")
}

/**
 * Tenant-admin credentials for POST /accounts
 * (Cloudflare Tenant / MSP partners only).
 * @see https://developers.cloudflare.com/api/resources/accounts/methods/create
 */
export function getCloudflareTenantAdminAuth(): CloudflareTenantAdminAuth {
  const email = firstEnv(
    "CLOUDFARE_TENANT_EMAIL",
    "CLOUDFLARE_TENANT_EMAIL"
  )
  const apiKey = firstEnv(
    "CLOUDFARE_TENANT_API_KEY",
    "CLOUDFLARE_TENANT_API_KEY"
  )

  if (!email || !apiKey) {
    throw new Error(
      "Cloudflare Tenant admin credentials are not configured (CLOUDFARE_TENANT_EMAIL + CLOUDFARE_TENANT_API_KEY)"
    )
  }

  return { mode: "tenantAdmin", email, apiKey }
}

/** Optional Tenant unit ID when creating child accounts under a unit. */
export function getCloudflareTenantUnitId(): string | undefined {
  return firstEnv("CLOUDFARE_TENANT_UNIT_ID", "CLOUDFLARE_TENANT_UNIT_ID")
}

export function getCloudflareApiTokenAuth(): CloudflareApiTokenAuth {
  return { mode: "apiToken", token: getCloudflareApiToken() }
}

/**
 * Auth for Gateway / Zero Trust account-scoped APIs.
 * Uses the platform API token (same as Access). Tenant admin
 * email+key is only for POST /accounts (MSP create-child).
 */
export function getCloudflareGatewayAuth(): CloudflareApiTokenAuth {
  return getCloudflareApiTokenAuth()
}

/** True when Tenant admin env is configured for child-account create. */
export function hasCloudflareTenantAdminAuth(): boolean {
  return Boolean(
    firstEnv("CLOUDFARE_TENANT_EMAIL", "CLOUDFLARE_TENANT_EMAIL") &&
      firstEnv("CLOUDFARE_TENANT_API_KEY", "CLOUDFLARE_TENANT_API_KEY")
  )
}
