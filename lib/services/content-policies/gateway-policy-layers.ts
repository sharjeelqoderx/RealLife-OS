import { listGatewayAppTypes } from "@/lib/services/cloudflare/app-types"
import type { GatewayRuleAction } from "@/lib/services/cloudflare/rules"
import type { CreateGatewayPolicyInput } from "@/schemas/content-policies/gateway-policy"

/**
 * Layered Gateway expressions for device-level enforcement.
 * DNS, L4, and HTTP are separate Cloudflare filters (evaluated independently).
 *
 * @see https://developers.cloudflare.com/cloudflare-one/traffic-policies/dns-policies/
 * @see https://developers.cloudflare.com/cloudflare-one/traffic-policies/network-policies/
 * @see https://developers.cloudflare.com/cloudflare-one/traffic-policies/http-policies/
 */

export const FALLBACK_DNS_PRECEDENCE_BASE = 40
export const DEVICE_ALLOW_PRECEDENCE_BASE = 80
export const DEVICE_BLOCK_PRECEDENCE_BASE = 100
export const PROFILE_ALLOW_PRECEDENCE_BASE = 480
export const PROFILE_BLOCK_PRECEDENCE_BASE = 500
export const UNASSIGNED_ALLOW_PRECEDENCE_BASE = 980
export const UNASSIGNED_BLOCK_PRECEDENCE_BASE = 1000

/** Public resolvers apps use as DNS fallback. Never include Cloudflare 1.1.1.1 / 1.0.0.1. */
export const FALLBACK_DNS_RESOLVER_IPS = [
  "8.8.8.8",
  "8.8.4.4",
  "2001:4860:4860::8888",
  "2001:4860:4860::8844",
  "9.9.9.9",
  "149.112.112.112",
  "2620:fe::fe",
  "2620:fe::9",
  "208.67.222.222",
  "208.67.220.220",
] as const

export const YOUTUBE_DOMAIN_ROOTS = [
  "youtube.com",
  "youtu.be",
  "youtube-nocookie.com",
  "googlevideo.com",
  "ytimg.com",
  "ggpht.com",
  "youtubei.googleapis.com",
  "yt3.ggpht.com",
] as const

const YOUTUBE_APP_NAME_PATTERN = /^(youtube|youtube kids|youtube music)$/i

export type GatewayLayerFilter = "dns" | "http" | "l4"

export type GatewayLayerPlan = {
  role: "dns" | "http" | "l4_fallback_dns"
  filters: GatewayLayerFilter[]
  action: GatewayRuleAction
  traffic: string
}

export function buildFallbackDnsTrafficExpression(): string {
  const ips = FALLBACK_DNS_RESOLVER_IPS.join(" ")
  // net.dst.ip is a scalar Ip, not a list. MapEach (`[*]`) is rejected by Gateway.
  // @see https://developers.cloudflare.com/cloudflare-one/traffic-policies/expression-syntax/
  return `(net.protocol == "tcp" or net.protocol == "udp") and net.dst.port in {53 853} and net.dst.ip in {${ips}}`
}

export function buildHttpTrafficExpression(input: {
  appIds: number[]
  hosts: string[]
  domainRoots: string[]
}): string | null {
  const parts: string[] = []
  const appIds = [...new Set(input.appIds)].filter((id) => id > 0)
  if (appIds.length > 0) {
    parts.push(`any(app.ids[*] in {${appIds.join(" ")}})`)
  }

  const hosts = uniqueHostnames(input.hosts)
  if (hosts.length === 1) {
    parts.push(`http.request.host == "${hosts[0]}"`)
  } else if (hosts.length > 1) {
    parts.push(
      `http.request.host in {${hosts.map((host) => `"${host}"`).join(" ")}}`
    )
  }

  const roots = uniqueHostnames(input.domainRoots)
  if (roots.length === 1) {
    parts.push(`any(http.request.domains[*] in {"${roots[0]}"})`)
  } else if (roots.length > 1) {
    parts.push(
      `any(http.request.domains[*] in {${roots.map((root) => `"${root}"`).join(" ")}})`
    )
  }

  if (parts.length === 0) return null
  return parts.join(" or ")
}

export async function resolveYoutubeAppIds(accountId: string): Promise<number[]> {
  const entries = await listGatewayAppTypes(accountId)
  const ids: number[] = []
  for (const entry of entries) {
    if (
      entry.id == null ||
      entry.application_type_id == null ||
      !entry.name?.trim()
    ) {
      continue
    }
    if (YOUTUBE_APP_NAME_PATTERN.test(entry.name.trim())) {
      ids.push(entry.id)
    }
  }
  return [...new Set(ids)]
}

export function youtubeNeedsExpandedCoverage(input: {
  type: CreateGatewayPolicyInput["type"]
  apps: readonly string[]
  appIds?: readonly number[]
}): boolean {
  if (input.type === "ytrestricted") return true
  const labels = input.apps.map((app) => app.trim().toLowerCase())
  return labels.some(
    (label) => label.includes("youtube") || label === "yt"
  )
}

export async function expandAppIdsForPolicy(
  accountId: string,
  input: CreateGatewayPolicyInput
): Promise<number[]> {
  const appIds = [...new Set(input.appIds ?? [])]
  if (!youtubeNeedsExpandedCoverage(input)) return appIds
  if (appIds.length > 0) return appIds
  try {
    const youtubeIds = await resolveYoutubeAppIds(accountId)
    return [...new Set([...appIds, ...youtubeIds])]
  } catch (error) {
    console.warn("expandAppIdsForPolicy: YouTube catalog lookup failed", error)
    return appIds
  }
}

export function youtubeDomainRootsForInput(input: {
  type: CreateGatewayPolicyInput["type"]
  apps: readonly string[]
  domainRoots: readonly string[]
}): string[] {
  const roots = [...input.domainRoots]
  if (!youtubeNeedsExpandedCoverage(input)) {
    return roots
  }
  for (const root of YOUTUBE_DOMAIN_ROOTS) {
    if (!roots.includes(root)) roots.push(root)
  }
  return roots
}

/**
 * HTTP layer is created for block/allow when we have app or host selectors.
 * safesearch / ytrestricted are DNS Gateway actions — not HTTP/L4 actions.
 */
export function shouldCreateHttpLayer(
  type: CreateGatewayPolicyInput["type"],
  httpTraffic: string | null
): boolean {
  if (type !== "block" && type !== "allow" && type !== "ytrestricted") {
    return false
  }
  return Boolean(httpTraffic)
}

export function shouldCreateFallbackDnsLayer(
  type: CreateGatewayPolicyInput["type"]
): boolean {
  return type === "block" || type === "ytrestricted" || type === "safesearch"
}

function uniqueHostnames(values: readonly string[]): string[] {
  return [
    ...new Set(
      values
        .map((value) =>
          value
            .trim()
            .toLowerCase()
            .replace(/^https?:\/\//, "")
            .replace(/\/.*$/, "")
            .replace(/^\*\./, "")
        )
        .filter(Boolean)
    ),
  ]
}

/**
 * Lower number = higher Cloudflare priority (first-match).
 * Within an assignment tier: allow → block → ytrestricted → safesearch.
 * Hard blocks must beat soft YouTube Restricted, or Restricted matches first
 * and the block policy never runs (Repair alone cannot fix that).
 */
export function assignmentPrecedenceBase(input: {
  action: GatewayRuleAction
  hasDeviceAssignment: boolean
  hasAssignments: boolean
}): number {
  if (input.action === "allow") {
    if (input.hasDeviceAssignment) return DEVICE_ALLOW_PRECEDENCE_BASE
    if (input.hasAssignments) return PROFILE_ALLOW_PRECEDENCE_BASE
    return UNASSIGNED_ALLOW_PRECEDENCE_BASE
  }

  let band = UNASSIGNED_BLOCK_PRECEDENCE_BASE
  if (input.hasDeviceAssignment) band = DEVICE_BLOCK_PRECEDENCE_BASE
  else if (input.hasAssignments) band = PROFILE_BLOCK_PRECEDENCE_BASE

  if (input.action === "block") return band
  if (input.action === "ytrestricted") return band + 40
  if (input.action === "safesearch") return band + 50
  return band + 30
}

/** Cloudflare requires unique precedence on every Gateway rule in the account. */
export function nextAvailableGatewayPrecedence(
  used: Iterable<number | null | undefined>,
  preferred: number
): number {
  const taken = new Set<number>()
  for (const value of used) {
    if (typeof value === "number" && Number.isFinite(value)) {
      taken.add(value)
    }
  }
  let candidate = Math.max(1, Math.floor(preferred))
  while (taken.has(candidate)) {
    candidate += 1
  }
  return candidate
}

export function takeNextGatewayPrecedence(
  used: Set<number>,
  preferred: number
): number {
  const value = nextAvailableGatewayPrecedence(used, preferred)
  used.add(value)
  return value
}
