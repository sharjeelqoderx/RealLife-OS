import {
  getCloudflareAccountId,
  hasCloudflarePlatformConfig,
} from "@/lib/cloudflare/config"
import { createClient } from "@/lib/supabase/server"

export class DeviceServiceError extends Error {
  readonly status: number
  readonly code: string

  constructor(message: string, status = 400, code = "DEVICE_ERROR") {
    super(message)
    this.name = "DeviceServiceError"
    this.status = status
    this.code = code
  }
}

export async function requireAuthenticatedUserId(): Promise<string> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new DeviceServiceError("Unauthorized", 401, "UNAUTHORIZED")
  }

  return user.id
}

/**
 * Shared Zero Trust account context (Model B).
 * `tenantReady` means the platform Cloudflare account is configured —
 * not that a per-user child account was provisioned.
 */
export async function getDeviceAccountContext(_userId: string): Promise<{
  accountId: string
  tenantReady: boolean
}> {
  if (!hasCloudflarePlatformConfig()) {
    return { accountId: "", tenantReady: false }
  }

  return {
    accountId: getCloudflareAccountId(),
    tenantReady: true,
  }
}

export function mapCloudflareDeviceType(
  deviceType: string | undefined
): "android" | "iphone" | "unknown" {
  const normalized = (deviceType ?? "").toLowerCase()

  if (normalized.includes("android")) {
    return "android"
  }

  if (
    normalized.includes("ios") ||
    normalized.includes("iphone") ||
    normalized.includes("ipad")
  ) {
    return "iphone"
  }

  return "unknown"
}

export function minutesSince(isoTimestamp: string | undefined): number {
  if (!isoTimestamp) {
    return Number.MAX_SAFE_INTEGER
  }

  const then = new Date(isoTimestamp).getTime()
  if (Number.isNaN(then)) {
    return Number.MAX_SAFE_INTEGER
  }

  return Math.max(0, Math.floor((Date.now() - then) / 60_000))
}

export function slugifyTeamNameFallback(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32)
}
