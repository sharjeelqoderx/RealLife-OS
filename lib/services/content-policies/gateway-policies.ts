import { getCloudflareAccountId } from "@/lib/cloudflare/config"
import { listGatewayAppTypes } from "@/lib/services/cloudflare/app-types"
import {
  listGatewayCategories,
  resolveCategoryIdsByLabels,
  type GatewayCategory,
} from "@/lib/services/cloudflare/categories"
import { listGatewayLocations } from "@/lib/services/cloudflare/locations"
import {
  createGatewayRule,
  deleteGatewayRule,
  getGatewayRule,
  listGatewayRules,
  updateGatewayRule,
  type GatewayRule,
  type GatewayRuleAction,
  type GatewaySchedule,
} from "@/lib/services/cloudflare/rules"
import {
  parseGatewaySchedule,
  parseTrafficExpression,
} from "@/lib/services/content-policies/parse-gateway-rule"
import { getTenantCloudflareAccountForUser } from "@/lib/services/tenants/provision"
import { createClient } from "@/lib/supabase/server"
import type {
  CreateGatewayPolicyInput,
  GatewayPolicyType,
} from "@/schemas/content-policies/gateway-policy"
import type { PolicyListItem, PolicyType } from "@/schemas/content-policies/policy"

/** Known consumer apps → domains for DNS policies (Phase 1 without app-ID catalog). */
const APP_DOMAIN_MAP: Record<string, string[]> = {
  youtube: ["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"],
  tiktok: ["tiktok.com", "www.tiktok.com"],
  facebook: ["facebook.com", "www.facebook.com", "fb.com"],
  "facebook messenger": ["messenger.com", "www.messenger.com"],
  instagram: ["instagram.com", "www.instagram.com"],
  snapchat: ["snapchat.com", "www.snapchat.com"],
  twitter: ["twitter.com", "x.com", "www.x.com"],
  x: ["x.com", "twitter.com"],
  discord: ["discord.com", "discord.gg"],
  whatsapp: ["whatsapp.com", "web.whatsapp.com"],
  telegram: ["telegram.org", "web.telegram.org", "t.me"],
  roblox: ["roblox.com", "www.roblox.com"],
  minecraft: ["minecraft.net", "www.minecraft.net"],
  netflix: ["netflix.com", "www.netflix.com"],
  twitch: ["twitch.tv", "www.twitch.tv"],
  reddit: ["reddit.com", "www.reddit.com"],
  tumblr: ["tumblr.com"],
  pinterest: ["pinterest.com"],
  linkedin: ["linkedin.com"],
  slack: ["slack.com"],
  zoom: ["zoom.us"],
  dropbox: ["dropbox.com"],
  gmail: ["mail.google.com", "gmail.com"],
  "google workspace": ["workspace.google.com", "mail.google.com"],
}

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const

const SAFESEARCH_DOMAINS = [
  "google.com",
  "www.google.com",
  "bing.com",
  "www.bing.com",
  "duckduckgo.com",
  "www.duckduckgo.com",
  "search.yahoo.com",
  "yandex.com",
]

const YOUTUBE_DOMAINS = [
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
  "youtubei.googleapis.com",
]

function pad2(n: number) {
  return n.toString().padStart(2, "0")
}

function formatRange(
  startHour: number,
  startMinute: number,
  durationMinutes: number
): string {
  const startTotal = startHour * 60 + startMinute
  const endTotal = startTotal + durationMinutes
  const endHour = Math.floor(endTotal / 60) % 24
  const endMinute = endTotal % 60
  return `${pad2(startHour)}:${pad2(startMinute)}-${pad2(endHour)}:${pad2(endMinute)}`
}

export function buildGatewaySchedule(
  blocks: CreateGatewayPolicyInput["schedules"],
  timeZone?: string
): GatewaySchedule | undefined {
  if (blocks.length === 0) return undefined

  const byDay: Record<(typeof DAY_KEYS)[number], string[]> = {
    sun: [],
    mon: [],
    tue: [],
    wed: [],
    thu: [],
    fri: [],
    sat: [],
  }

  for (const block of blocks) {
    const key = DAY_KEYS[block.dayIndex]
    if (!key) continue
    byDay[key].push(
      formatRange(block.startHour, block.startMinute, block.durationMinutes)
    )
  }

  const schedule: GatewaySchedule = {}
  for (const key of DAY_KEYS) {
    if (byDay[key].length > 0) {
      schedule[key] = byDay[key].join(",")
    }
  }

  if (timeZone) {
    schedule.time_zone = timeZone
  }

  return Object.keys(schedule).length > 0 ? schedule : undefined
}

function domainsFromApps(apps: string[]): string[] {
  const domains = new Set<string>()
  for (const app of apps) {
    const key = app.trim().toLowerCase()
    const mapped = APP_DOMAIN_MAP[key]
    if (mapped) {
      mapped.forEach((d) => domains.add(d))
      continue
    }

    // Fuzzy: "Online Video (YouTube...)" style won't match — try includes
    for (const [name, hosts] of Object.entries(APP_DOMAIN_MAP)) {
      if (key.includes(name) || name.includes(key)) {
        hosts.forEach((d) => domains.add(d))
      }
    }
  }
  return [...domains]
}

function sanitizeHostname(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/^\*\./, "")
}

function escapeWirefilterRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/** Host selector — exact hostname only. */
function buildFqdnExpression(domains: string[]): string | null {
  const clean = [...new Set(domains.map(sanitizeHostname).filter(Boolean))]
  if (clean.length === 0) return null
  if (clean.length === 1) {
    return `dns.fqdn == "${clean[0]}"`
  }
  return `dns.fqdn in {${clean.map((d) => `"${d}"`).join(" ")}}`
}

/** Domain selector — domain + all subdomains (Auto-Detect). */
function buildDomainRootExpression(domains: string[]): string | null {
  const clean = [...new Set(domains.map(sanitizeHostname).filter(Boolean))]
  if (clean.length === 0) return null
  if (clean.length === 1) {
    return `any(dns.domains[*] == "${clean[0]}")`
  }
  return `any(dns.domains[*] in {${clean.map((d) => `"${d}"`).join(" ")}})`
}

/** Keyword tab — substring match on hostname. */
function buildKeywordExpression(keywords: string[]): string | null {
  const clean = [
    ...new Set(
      keywords
        .map((k) => k.trim().toLowerCase())
        .filter((k) => k.length > 0)
    ),
  ]
  if (clean.length === 0) return null
  const pattern = clean
    .map((k) => `.*${escapeWirefilterRegex(k)}.*`)
    .join("|")
  return `dns.fqdn matches "${pattern}"`
}

function buildCategoryExpression(ids: number[]): string | null {
  if (ids.length === 0) return null
  return `any(dns.content_category[*] in {${ids.join(" ")}})`
}

function buildLocationExpression(locationIds: string[]): string | null {
  if (locationIds.length === 0) return null
  if (locationIds.length === 1) {
    return `dns.location == "${locationIds[0]}"`
  }
  return `dns.location in {${locationIds.map((id) => `"${id}"`).join(" ")}}`
}

function buildAppExpression(appIds: number[]): string | null {
  if (appIds.length === 0) return null
  return `any(app.ids[*] in {${appIds.join(" ")}})`
}

export function mapPolicyTypeToAction(
  type: GatewayPolicyType
): GatewayRuleAction {
  switch (type) {
    case "allow":
      return "allow"
    case "block":
      return "block"
    case "safesearch":
      return "safesearch"
    case "ytrestricted":
      return "ytrestricted"
  }
}

export async function buildTrafficExpression(
  accountId: string,
  input: CreateGatewayPolicyInput
): Promise<{ traffic: string; filters: Array<"dns" | "http"> }> {
  const parts: string[] = []

  const resolvedIds = await resolveCategoryIdsByLabels(
    accountId,
    input.categories
  )
  const categoryIds = [...new Set([...input.categoryIds, ...resolvedIds])]
  const categoryExpr = buildCategoryExpression(categoryIds)
  if (categoryExpr) parts.push(categoryExpr)

  let domains = [...input.domains, ...domainsFromApps(input.apps)]

  if (input.type === "safesearch" && domains.length === 0) {
    domains = SAFESEARCH_DOMAINS
  }
  if (input.type === "ytrestricted" && domains.length === 0) {
    domains = YOUTUBE_DOMAINS
  }

  const fqdnExpr = buildFqdnExpression(domains)
  if (fqdnExpr) parts.push(fqdnExpr)

  const domainRootExpr = buildDomainRootExpression(input.domainRoots ?? [])
  if (domainRootExpr) parts.push(domainRootExpr)

  const keywordExpr = buildKeywordExpression(input.domainKeywords ?? [])
  if (keywordExpr) parts.push(keywordExpr)

  const locationExpr = buildLocationExpression(input.locationIds)
  if (locationExpr) parts.push(locationExpr)

  const appIds = [...new Set(input.appIds ?? [])]
  const appExpr = buildAppExpression(appIds)

  const hasDnsParts = parts.length > 0
  // Application IDs require HTTP filter; DNS rules use domain fallback for apps.
  if (appExpr && !hasDnsParts) {
    return { traffic: appExpr, filters: ["http"] }
  }

  if (parts.length === 0) {
    // Gateway requires a traffic expression; match-all for typed actions only
    if (input.type === "safesearch" || input.type === "ytrestricted") {
      return {
        traffic: buildFqdnExpression(
          input.type === "safesearch" ? SAFESEARCH_DOMAINS : YOUTUBE_DOMAINS
        )!,
        filters: ["dns"],
      }
    }
    throw new Error("Policy needs categories, apps, domains, or audience")
  }

  return { traffic: parts.join(" and "), filters: ["dns"] }
}

/**
 * Cloudflare account ID used for Gateway policy operations for this user:
 * ready tenant child account when provisioned, otherwise the platform account.
 */
export async function getPolicyCloudflareAccountId(
  userId?: string
): Promise<string> {
  if (userId) {
    try {
      const tenant = await getTenantCloudflareAccountForUser(userId)
      if (
        tenant?.status === "ready" &&
        tenant.cloudflareAccountId &&
        tenant.cloudflareAccountId !== "pending"
      ) {
        return tenant.cloudflareAccountId
      }
    } catch (error) {
      console.warn(
        "getPolicyCloudflareAccountId: tenant lookup failed, using platform account:",
        error
      )
    }
  }
  return getCloudflareAccountId()
}

/**
 * Load a Gateway rule from the tenant account when provisioned, otherwise
 * the platform account. Retries the platform account on miss so policies
 * created before tenant provision still open in the editor.
 */
async function getGatewayRuleForUser(
  userId: string | undefined,
  policyId: string
): Promise<GatewayRule> {
  const primaryAccountId = await getPolicyCloudflareAccountId(userId)
  try {
    return await getGatewayRule(primaryAccountId, policyId)
  } catch (error) {
    const platformAccountId = getCloudflareAccountId()
    if (platformAccountId === primaryAccountId) throw error
    const message = error instanceof Error ? error.message : String(error)
    if (!/not found|could not find|404/i.test(message)) throw error
    return await getGatewayRule(platformAccountId, policyId)
  }
}

function mapGatewayActionToPolicyType(action: string | undefined): PolicyType {
  if (action === "allow") return "allow"
  if (action === "block") return "block"
  if (action === "ytrestricted") return "ytrestricted"
  if (action === "safesearch") return "safesearch"
  return "block"
}

function formatTypeLabel(type: PolicyType): string {
  if (type === "ytrestricted") return "YouTube Restricted"
  if (type === "safesearch") return "SafeSearch"
  if (type === "allow") return "Allow"
  return "Block"
}

export function mapGatewayRuleToListItem(rule: GatewayRule): PolicyListItem {
  const type = mapGatewayActionToPolicyType(rule.action)
  const updatedAt = rule.updated_at ?? rule.created_at
  return {
    id: rule.id ?? "",
    name: rule.name ?? "Untitled",
    type,
    typeLabel: formatTypeLabel(type),
    rulesCount: 1,
    status: rule.enabled === false ? "inactive" : "active",
    updatedAt: updatedAt
      ? new Date(updatedAt).toLocaleDateString()
      : "—",
  }
}

export async function getGatewayPolicyById(
  policyId: string
): Promise<GatewayPolicyDetail | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const accountId = await getPolicyCloudflareAccountId(user?.id)

  try {
    const rule = await getGatewayRuleForUser(user?.id, policyId)
    if (!rule?.id) return null
    return mapGatewayRuleToDetail(rule)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (/authentication error/i.test(message)) {
      const { listAccessPolicies } = await import(
        "@/lib/services/content-policies/access-policies"
      )
      const policies = await listAccessPolicies()
      const match = policies.find((p) => p.id === policyId)
      if (!match) return null
      return {
        id: match.id,
        name: match.name,
        type: match.type,
        typeLabel: match.typeLabel,
        status: match.status,
        description: null,
        enabled: match.status === "active",
        traffic: null,
        action: match.type,
        filters: ["dns"],
        schedule: null,
        precedence: null,
        createdAt: null,
        updatedAt: match.updatedAt,
        source: "access",
      }
    }
    if (/not found|could not find|404/i.test(message)) {
      try {
        const { listAccessPolicies } = await import(
          "@/lib/services/content-policies/access-policies"
        )
        const policies = await listAccessPolicies()
        const match = policies.find((p) => p.id === policyId)
        if (!match) return null
        return {
          id: match.id,
          name: match.name,
          type: match.type,
          typeLabel: match.typeLabel,
          status: match.status,
          description: null,
          enabled: match.status === "active",
          traffic: null,
          action: match.type,
          filters: ["dns"],
          schedule: null,
          precedence: null,
          createdAt: null,
          updatedAt: match.updatedAt,
          source: "access",
        }
      } catch {
        return null
      }
    }
    throw error
  }
}

export type GatewayPolicyDetail = {
  id: string
  name: string
  type: PolicyType
  typeLabel: string
  status: "active" | "inactive"
  description: string | null
  enabled: boolean
  traffic: string | null
  action: string
  filters: string[]
  schedule: GatewayRule["schedule"] | null
  precedence: number | null
  createdAt: string | null
  updatedAt: string | null
  source: "gateway" | "access"
}

function mapGatewayRuleToDetail(rule: GatewayRule): GatewayPolicyDetail {
  const type = mapGatewayActionToPolicyType(rule.action)
  return {
    id: rule.id ?? "",
    name: rule.name ?? "Untitled",
    type,
    typeLabel: formatTypeLabel(type),
    status: rule.enabled === false ? "inactive" : "active",
    description: rule.description ?? null,
    enabled: rule.enabled !== false,
    traffic: rule.traffic ?? null,
    action: rule.action ?? type,
    filters: rule.filters ?? ["dns"],
    schedule: rule.schedule ?? null,
    precedence: rule.precedence ?? null,
    createdAt: rule.created_at ?? null,
    updatedAt: rule.updated_at ?? rule.created_at ?? null,
    source: "gateway",
  }
}

export async function listGatewayPolicies(): Promise<PolicyListItem[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const accountId = await getPolicyCloudflareAccountId(user?.id)

  try {
    const rules = await listGatewayRules(accountId)
    return rules
      .filter((r) => r.filters?.includes("dns") || !r.filters?.length)
      .map(mapGatewayRuleToListItem)
      .filter((item) => item.id)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    // Token may have Access permissions but not Gateway/Zero Trust yet.
    if (/authentication error/i.test(message)) {
      console.warn(
        "listGatewayPolicies: Gateway auth failed — falling back to Access policies. Grant the API token Zero Trust / Gateway Read permissions.",
        message
      )
      const { listAccessPolicies } = await import(
        "@/lib/services/content-policies/access-policies"
      )
      return listAccessPolicies()
    }
    throw error
  }
}

export async function createGatewayPolicy(
  input: CreateGatewayPolicyInput
): Promise<GatewayRule> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("Unauthorized")
  }

  const accountId = await getPolicyCloudflareAccountId(user.id)

  try {
    const { traffic, filters } = await buildTrafficExpression(accountId, input)
    const schedule = buildGatewaySchedule(input.schedules, input.timeZone)
    const action = mapPolicyTypeToAction(input.type)

    return await createGatewayRule(accountId, {
      name: input.name,
      action,
      description: input.description,
      enabled: input.enabled ?? true,
      filters,
      traffic,
      schedule,
      precedence: input.precedence,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (/authentication error/i.test(message)) {
      throw new Error(
        "Cloudflare Gateway authentication failed. Update CLOUDFARE_API_TOKEN with Zero Trust (Gateway) Read/Write permissions, then retry."
      )
    }
    throw error
  }
}

/**
 * Update an existing Gateway DNS rule from the shared editor payload.
 */
export async function updateGatewayPolicy(
  policyId: string,
  input: CreateGatewayPolicyInput
): Promise<GatewayRule> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("Unauthorized")
  }

  if (!policyId.trim()) {
    throw new Error("Policy ID is required")
  }

  const accountId = await getPolicyCloudflareAccountId(user.id)

  try {
    const existing = await getGatewayRule(accountId, policyId)
    if (!existing?.id) {
      throw new Error("Policy not found")
    }

    const { traffic, filters } = await buildTrafficExpression(accountId, input)
    const schedule = buildGatewaySchedule(input.schedules, input.timeZone)
    const action = mapPolicyTypeToAction(input.type)

    return await updateGatewayRule(accountId, policyId, {
      name: input.name,
      action,
      description: input.description,
      enabled: input.enabled ?? true,
      filters,
      traffic,
      schedule,
      precedence: input.precedence ?? existing.precedence,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (/authentication error/i.test(message)) {
      throw new Error(
        "Cloudflare Gateway authentication failed. Update CLOUDFARE_API_TOKEN with Zero Trust (Gateway) Read/Write permissions, then retry."
      )
    }
    throw error
  }
}

export type GatewayPolicyEditorPicked = {
  id: string
  label: string
  groupLabel: string
}

export type GatewayPolicyEditorAddress = {
  url: string
  mode: "auto" | "address" | "keyword"
}

export type GatewayPolicyEditorSchedule = {
  dayIndex: number
  startHour: number
  startMinute: number
  durationMinutes: number
}

/** Serializable editor state for create-form prepopulation on edit. */
export type GatewayPolicyEditorData = {
  id: string
  name: string
  type: GatewayPolicyType
  enabled: boolean
  categories: GatewayPolicyEditorPicked[]
  apps: GatewayPolicyEditorPicked[]
  locations: GatewayPolicyEditorPicked[]
  addresses: GatewayPolicyEditorAddress[]
  schedules: GatewayPolicyEditorSchedule[]
  timeZone?: string
  precedence?: number | null
  source: "gateway" | "access"
}

function flattenCategoryLabelMap(
  categories: GatewayCategory[]
): Map<number, { label: string; groupLabel: string }> {
  const map = new Map<number, { label: string; groupLabel: string }>()

  const walk = (nodes: GatewayCategory[], parentName?: string) => {
    for (const node of nodes) {
      if (node.id == null || !node.name?.trim()) continue
      const label = node.name.trim()
      map.set(node.id, {
        label,
        groupLabel: (parentName ?? label).toUpperCase(),
      })
      if (node.subcategories?.length) {
        walk(node.subcategories, label)
      }
    }
  }

  walk(categories)
  return map
}

/**
 * Load a Gateway rule and map traffic/schedule into editor form fields.
 */
export async function getGatewayPolicyForEditor(
  policyId: string
): Promise<GatewayPolicyEditorData | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let rule: GatewayRule | null = null
  try {
    rule = await getGatewayRuleForUser(user?.id, policyId)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (/authentication error|not found|could not find|404/i.test(message)) {
      // Soft Access fallback (name/type only — no DNS traffic to parse).
      try {
        const { listAccessPolicies } = await import(
          "@/lib/services/content-policies/access-policies"
        )
        const policies = await listAccessPolicies()
        const match = policies.find((p) => p.id === policyId)
        if (!match) return null
        return {
          id: match.id,
          name: match.name,
          type: match.type,
          enabled: match.status === "active",
          categories: [],
          apps: [],
          locations: [],
          addresses: [],
          schedules: [],
          precedence: null,
          source: "access",
        }
      } catch {
        return null
      }
    }
    throw error
  }

  if (!rule?.id) return null

  const detail = mapGatewayRuleToDetail(rule)
  const accountId = await getPolicyCloudflareAccountId(user?.id)

  const parsed = parseTrafficExpression(detail.traffic)
  const { blocks, timeZone } = parseGatewaySchedule(detail.schedule)

  let categoryMap = new Map<number, { label: string; groupLabel: string }>()
  let appMap = new Map<number, { label: string; groupLabel: string }>()
  let locationMap = new Map<string, string>()

  try {
    const [categories, appTypes, locations] = await Promise.all([
      listGatewayCategories(accountId),
      listGatewayAppTypes(accountId),
      listGatewayLocations(accountId),
    ])
    categoryMap = flattenCategoryLabelMap(categories)

    const typeNames = new Map<number, string>()
    for (const entry of appTypes) {
      if (
        entry.id != null &&
        entry.name?.trim() &&
        entry.application_type_id == null
      ) {
        typeNames.set(entry.id, entry.name.trim())
      }
    }
    for (const entry of appTypes) {
      if (
        entry.id == null ||
        !entry.name?.trim() ||
        entry.application_type_id == null
      ) {
        continue
      }
      appMap.set(entry.id, {
        label: entry.name.trim(),
        groupLabel: (
          typeNames.get(entry.application_type_id) ?? "APPLICATIONS"
        ).toUpperCase(),
      })
    }

    for (const loc of locations) {
      if (loc.id && loc.name?.trim()) {
        locationMap.set(loc.id, loc.name.trim())
      }
    }
  } catch (error) {
    console.warn("getGatewayPolicyForEditor: catalog enrich failed", error)
  }

  const categories = parsed.categoryIds.map((id) => {
    const meta = categoryMap.get(id)
    return {
      id: String(id),
      label: meta?.label ?? `Category ${id}`,
      groupLabel: meta?.groupLabel ?? "CATEGORIES",
    }
  })

  const apps = parsed.appIds.map((id) => {
    const meta = appMap.get(id)
    return {
      id: String(id),
      label: meta?.label ?? `App ${id}`,
      groupLabel: meta?.groupLabel ?? "APPLICATIONS",
    }
  })

  const locations = parsed.locationIds.map((id) => ({
    id,
    label: locationMap.get(id) ?? id,
    groupLabel: "DNS LOCATIONS",
  }))

  const addresses: GatewayPolicyEditorAddress[] = [
    ...parsed.domainRoots.map((url) => ({
      url,
      mode: "auto" as const,
    })),
    ...parsed.hosts.map((url) => ({
      url,
      mode: "address" as const,
    })),
    ...parsed.keywords.map((url) => ({
      url,
      mode: "keyword" as const,
    })),
  ]

  return {
    id: detail.id,
    name: detail.name,
    type: detail.type,
    enabled: detail.enabled,
    categories,
    apps,
    locations,
    addresses,
    schedules: blocks,
    timeZone,
    precedence: detail.precedence,
    source: "gateway",
  }
}

/**
 * Delete a Gateway DNS rule; falls back to Access app policy delete when
 * the list is served from Access (Gateway auth unavailable / not found).
 */
export async function deleteGatewayPolicy(policyId: string): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("Unauthorized")
  }

  if (!policyId.trim()) {
    throw new Error("Policy ID is required")
  }

  const accountId = await getPolicyCloudflareAccountId(user.id)

  try {
    await deleteGatewayRule(accountId, policyId)
    return
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const shouldTryAccess =
      /authentication error|not found|could not find|404/i.test(message)

    if (!shouldTryAccess) {
      throw error
    }

    try {
      const { deleteAccessPolicy } = await import(
        "@/lib/services/content-policies/access-policies"
      )
      await deleteAccessPolicy(policyId)
      return
    } catch (accessError) {
      if (/authentication error/i.test(message)) {
        throw new Error(
          "Cloudflare Gateway authentication failed. Update CLOUDFARE_API_TOKEN with Zero Trust (Gateway) Edit permissions, then retry."
        )
      }
      throw accessError instanceof Error
        ? accessError
        : new Error("Failed to delete policy")
    }
  }
}
