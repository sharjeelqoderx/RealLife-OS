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

export type CloudflareAuth = CloudflareApiTokenAuth

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

/** Public organization identifiers, safe to display in WARP setup instructions. */
export function tryGetCloudflareTeamName(): string | undefined {
  return firstEnv(
    "CLOUDFLARE_TEAM_NAME",
    "CLOUDFARE_ZERO_TRUST_TEAM_NAME",
    "CLOUDFLARE_ZERO_TRUST_TEAM_NAME"
  )
}

export function getCloudflareTeamName(): string {
  return requireFirstEnv(
    "CLOUDFLARE_TEAM_NAME",
    "CLOUDFARE_ZERO_TRUST_TEAM_NAME",
    "CLOUDFLARE_ZERO_TRUST_TEAM_NAME"
  )
}

export function tryGetCloudflareTeamDomain(): string | undefined {
  return firstEnv(
    "CLOUDFLARE_TEAM_DOMAIN",
    "CLOUDFARE_TEAM_DOMAIN",
    "CLOUDFLARE_ZERO_TRUST_TEAM_DOMAIN",
    "CLOUDFARE_ZERO_TRUST_TEAM_DOMAIN"
  )
}

/**
 * Shared Zero Trust (Model B): one platform account for every RealLife user.
 * Ready when account id + API token are present — no per-user child tenant.
 */
export function hasCloudflarePlatformConfig(): boolean {
  return Boolean(tryGetCloudflareAccountId() && tryGetCloudflareApiToken())
}

export function getCloudflareAccessAppId(): string {
  return requireFirstEnv(
    "CLOUDFLARE_WARP_APP_ID",
    "CLOUDFARE_WARP_APP_ID",
    "CLOUDFARE_APP_ID",
    "CLOUDFLARE_APP_ID"
  )
}

export function tryGetCloudflareAccessAppId(): string | undefined {
  return firstEnv(
    "CLOUDFLARE_WARP_APP_ID",
    "CLOUDFARE_WARP_APP_ID",
    "CLOUDFARE_APP_ID",
    "CLOUDFLARE_APP_ID"
  )
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

