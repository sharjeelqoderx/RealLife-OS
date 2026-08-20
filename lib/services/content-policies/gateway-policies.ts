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
import {
  filterPolicies,
  type PolicyListFilters,
} from "@/lib/services/content-policies/get-policies"
import {
  buildIdentityExpression,
  getOwnedGatewayPolicy,
  listOwnedGatewayPolicies,
  markOwnedGatewayPolicyDeleted,
  recordOwnedGatewayPolicy,
  requirePolicyOwnershipStore,
  uniqueCloudflareGatewayRuleName,
  updateOwnedGatewayPolicyRecord,
} from "@/lib/services/content-policies/policy-ownership"
import { createClient } from "@/lib/supabase/server"
import type {
  CreateGatewayPolicyInput,
  GatewayPolicyType,
} from "@/schemas/content-policies/gateway-policy"
import type { PolicyListItem, PolicyType } from "@/schemas/content-policies/policy"
import type { Json } from "@/types/supabase"

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

async function createAdminAudit(
  userId: string,
  action: string,
  resourceId: string
): Promise<void> {
  const { createAdminClient } = await import("@/lib/supabase/admin")
  const { error } = await createAdminClient().from("audit_log").insert({
    user_id: userId,
    action,
    resource_type: "policy",
    resource_id: resourceId,
  })
  if (error) {
    console.error("policy audit log write failed", { action, resourceId })
  }
}

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

  let domains = [...input.domains]
  // Prefer Cloudflare app IDs (valid on DNS policies). Domain fallback is only
  // for legacy label-only payloads without numeric app IDs.
  const appIds = [...new Set(input.appIds ?? [])]
  if (appIds.length === 0) {
    domains = [...domains, ...domainsFromApps(input.apps)]
  }

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

  const appExpr = buildAppExpression(appIds)
  if (appExpr) parts.push(appExpr)

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
 * Cloudflare account ID for Gateway policy operations.
 * Model B: always the shared platform Zero Trust account.
 */
export async function getPolicyCloudflareAccountId(
  _userId?: string
): Promise<string> {
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
  if (!userId) {
    throw new Error("Unauthorized")
  }
  const policy = await getOwnedGatewayPolicy(userId, policyId)

  const primaryAccountId = await getPolicyCloudflareAccountId(userId)
  try {
    return await getGatewayRule(primaryAccountId, policy.cloudflareRuleId)
  } catch (error) {
    const platformAccountId = getCloudflareAccountId()
    if (platformAccountId === primaryAccountId) throw error
    const message = error instanceof Error ? error.message : String(error)
    if (!/not found|could not find|404/i.test(message)) throw error
    return await getGatewayRule(platformAccountId, policy.cloudflareRuleId)
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

  try {
    if (!user?.id) return null
    const owned = await getOwnedGatewayPolicy(user.id, policyId)
    const rule = await getGatewayRuleForUser(user.id, policyId)
    if (!rule?.id) return null
    const detail = {
      ...mapGatewayRuleToDetail(rule),
      id: policyId,
      name: owned.name?.trim() || rule.name || "Untitled",
    }
    const accountId = await getPolicyCloudflareAccountId(user.id)
    const selectors = await resolveTrafficSelectors(
      accountId,
      detail.traffic,
      owned.configurationJson
    )
    return { ...detail, ...selectors }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (/not found|could not find|404/i.test(message)) {
      return null
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
  categories: GatewayPolicyEditorPicked[]
  apps: GatewayPolicyEditorPicked[]
  locations: GatewayPolicyEditorPicked[]
  addresses: GatewayPolicyEditorAddress[]
}

export type GatewayPolicyMutationResult = {
  id: string
  name: string
  action: string
  enabled: boolean
  created_at?: string
  updated_at?: string
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
    categories: [],
    apps: [],
    locations: [],
    addresses: [],
  }
}

export async function listGatewayPolicies(
  filters: PolicyListFilters = {}
): Promise<PolicyListItem[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("Unauthorized")
  }

  const accountId = await getPolicyCloudflareAccountId(user.id)
  const ownedPolicies = await listOwnedGatewayPolicies(user.id)
  const localPolicyIdByCloudflareRuleId = new Map(
    ownedPolicies.map((policy) => [policy.cloudflareRuleId, policy.id])
  )

  const rules = await listGatewayRules(accountId)
  const policies = rules
    .filter((r) => r.filters?.includes("dns") || !r.filters?.length)
    .map((rule) => {
      const localPolicyId = rule.id
        ? localPolicyIdByCloudflareRuleId.get(rule.id)
        : undefined
      if (!localPolicyId) return null
      return { ...mapGatewayRuleToListItem(rule), id: localPolicyId }
    })
    .filter((item): item is PolicyListItem => item !== null)
    .filter((item) => item.id)

  return filterPolicies(policies, filters)
}

export async function createGatewayPolicy(
  input: CreateGatewayPolicyInput
): Promise<GatewayPolicyMutationResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) {
    throw new Error("Unauthorized")
  }

  await requirePolicyOwnershipStore()
  const accountId = await getPolicyCloudflareAccountId(user.id)

  try {
    const { traffic, filters } = await buildTrafficExpression(accountId, input)
    const schedule = buildGatewaySchedule(input.schedules, input.timeZone)
    const action = mapPolicyTypeToAction(input.type)
    const identity = buildIdentityExpression(user.email)

    const rule = await createGatewayRule(accountId, {
      name: uniqueCloudflareGatewayRuleName(input.name),
      action,
      description: input.description,
      enabled: input.enabled ?? true,
      filters,
      traffic,
      identity,
      schedule,
      precedence: input.precedence,
    })

    if (!rule.id) {
      throw new Error("Cloudflare did not return a Gateway rule id")
    }

    let localPolicyId: string
    try {
      localPolicyId = await recordOwnedGatewayPolicy({
        userId: user.id,
        name: input.name,
        description: input.description,
        type: input.type,
        cloudflareRuleId: rule.id,
        action,
        enabled: input.enabled ?? true,
        precedence: input.precedence ?? rule.precedence ?? 1000,
        configurationJson: JSON.parse(JSON.stringify(input)) as Json,
      })
    } catch (ownershipError) {
      try {
        await deleteGatewayRule(accountId, rule.id)
      } catch {
        console.error("Failed to compensate for unowned Cloudflare rule", {
          ruleId: rule.id,
        })
      }
      throw ownershipError
    }

    await createAdminAudit(user.id, "POLICY_CREATED", localPolicyId)
    return {
      id: localPolicyId,
      name: rule.name ?? input.name,
      action: rule.action ?? action,
      enabled: rule.enabled !== false,
      created_at: rule.created_at,
      updated_at: rule.updated_at,
    }
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
): Promise<GatewayPolicyMutationResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) {
    throw new Error("Unauthorized")
  }

  if (!policyId.trim()) {
    throw new Error("Policy ID is required")
  }

  const policy = await getOwnedGatewayPolicy(user.id, policyId)
  const accountId = await getPolicyCloudflareAccountId(user.id)

  try {
    const existing = await getGatewayRule(accountId, policy.cloudflareRuleId)
    if (!existing?.id) {
      throw new Error("Policy not found")
    }

    const action = mapPolicyTypeToAction(input.type)

    await updateOwnedGatewayPolicyRecord({
      userId: user.id,
      policyId,
      name: input.name,
      description: input.description,
      type: input.type,
      action,
      enabled: input.enabled ?? true,
      precedence: input.precedence ?? existing.precedence ?? 1000,
      configurationJson: JSON.parse(JSON.stringify(input)) as Json,
    })

    const { syncPolicyCloudflareEnforcement } = await import(
      "@/lib/services/policy-assignments/sync-policy-enforcement"
    )
    const syncResult = await syncPolicyCloudflareEnforcement(user.id, policyId)
    if (syncResult.syncStatus === "sync_failed") {
      throw new Error(syncResult.error ?? "Cloudflare policy sync failed")
    }

    const rule = await getGatewayRule(accountId, policy.cloudflareRuleId)
    await createAdminAudit(user.id, "POLICY_UPDATED", policyId)
    return {
      id: policyId,
      name: rule?.name ?? input.name,
      action: rule?.action ?? action,
      enabled: rule?.enabled !== false,
      created_at: rule?.created_at ?? existing.created_at,
      updated_at: rule?.updated_at,
    }
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

async function resolveTrafficSelectors(
  accountId: string,
  traffic: string | null,
  storedConfig?: Json | null
): Promise<{
  categories: GatewayPolicyEditorPicked[]
  apps: GatewayPolicyEditorPicked[]
  locations: GatewayPolicyEditorPicked[]
  addresses: GatewayPolicyEditorAddress[]
}> {
  const parsed = parseTrafficExpression(traffic)
  const stored = readStoredPolicySelectors(storedConfig)

  // Recover apps/categories that were saved locally but dropped from older
  // Cloudflare traffic expressions (pre-fix create/edit bug).
  for (const id of stored.appIds) {
    if (!parsed.appIds.includes(id)) parsed.appIds.push(id)
  }
  for (const id of stored.categoryIds) {
    if (!parsed.categoryIds.includes(id)) parsed.categoryIds.push(id)
  }
  for (const id of stored.locationIds) {
    if (!parsed.locationIds.includes(id)) parsed.locationIds.push(id)
  }
  for (const url of stored.hosts) {
    if (!parsed.hosts.includes(url)) parsed.hosts.push(url)
  }
  for (const url of stored.domainRoots) {
    if (!parsed.domainRoots.includes(url)) parsed.domainRoots.push(url)
  }
  for (const url of stored.keywords) {
    if (!parsed.keywords.includes(url)) parsed.keywords.push(url)
  }

  let categoryMap = new Map<number, { label: string; groupLabel: string }>()
  const appMap = new Map<number, { label: string; groupLabel: string }>()
  const locationMap = new Map<string, string>()

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
    console.warn("resolveTrafficSelectors: catalog enrich failed", error)
  }

  const categories = parsed.categoryIds.map((id) => {
    const meta = categoryMap.get(id)
    const storedLabel = stored.categoryLabels.get(id)
    return {
      id: String(id),
      label: meta?.label ?? storedLabel ?? `Category ${id}`,
      groupLabel: meta?.groupLabel ?? "CATEGORIES",
    }
  })

  const apps = parsed.appIds.map((id) => {
    const meta = appMap.get(id)
    const storedLabel = stored.appLabels.get(id)
    return {
      id: String(id),
      label: meta?.label ?? storedLabel ?? `App ${id}`,
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

  return { categories, apps, locations, addresses }
}

function readStoredPolicySelectors(config: Json | null | undefined): {
  appIds: number[]
  categoryIds: number[]
  locationIds: string[]
  hosts: string[]
  domainRoots: string[]
  keywords: string[]
  appLabels: Map<number, string>
  categoryLabels: Map<number, string>
} {
  const empty = {
    appIds: [] as number[],
    categoryIds: [] as number[],
    locationIds: [] as string[],
    hosts: [] as string[],
    domainRoots: [] as string[],
    keywords: [] as string[],
    appLabels: new Map<number, string>(),
    categoryLabels: new Map<number, string>(),
  }
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    return empty
  }

  const record = config as Record<string, unknown>
  const appIds = Array.isArray(record.appIds)
    ? record.appIds
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id) && id > 0)
    : []
  const categoryIds = Array.isArray(record.categoryIds)
    ? record.categoryIds
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id) && id > 0)
    : []
  const locationIds = Array.isArray(record.locationIds)
    ? record.locationIds.filter((id): id is string => typeof id === "string")
    : []
  const hosts = Array.isArray(record.domains)
    ? record.domains.filter((v): v is string => typeof v === "string")
    : []
  const domainRoots = Array.isArray(record.domainRoots)
    ? record.domainRoots.filter((v): v is string => typeof v === "string")
    : []
  const keywords = Array.isArray(record.domainKeywords)
    ? record.domainKeywords.filter((v): v is string => typeof v === "string")
    : []

  const appLabels = new Map<number, string>()
  if (Array.isArray(record.apps)) {
    for (let i = 0; i < appIds.length; i += 1) {
      const label = record.apps[i]
      if (typeof label === "string" && label.trim()) {
        appLabels.set(appIds[i]!, label.trim())
      }
    }
  }

  const categoryLabels = new Map<number, string>()
  if (Array.isArray(record.categories)) {
    for (let i = 0; i < categoryIds.length; i += 1) {
      const label = record.categories[i]
      if (typeof label === "string" && label.trim()) {
        categoryLabels.set(categoryIds[i]!, label.trim())
      }
    }
  }

  return {
    appIds,
    categoryIds,
    locationIds,
    hosts,
    domainRoots,
    keywords,
    appLabels,
    categoryLabels,
  }
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
    if (/not found|could not find|404/i.test(message)) {
      return null
    }
    throw error
  }

  if (!rule?.id || !user?.id) return null

  const owned = await getOwnedGatewayPolicy(user.id, policyId)
  const detail = mapGatewayRuleToDetail(rule)
  const accountId = await getPolicyCloudflareAccountId(user.id)
  const selectors = await resolveTrafficSelectors(
    accountId,
    detail.traffic,
    owned.configurationJson
  )
  const { blocks, timeZone } = parseGatewaySchedule(detail.schedule)

  return {
    id: policyId,
    name: owned.name?.trim() || detail.name,
    type: detail.type,
    enabled: detail.enabled,
    categories: selectors.categories,
    apps: selectors.apps,
    locations: selectors.locations,
    addresses: selectors.addresses,
    schedules: blocks,
    timeZone,
    precedence: detail.precedence,
    source: "gateway",
  }
}

/**
 * Delete an owned Gateway DNS rule on the shared Zero Trust account.
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

  const policy = await getOwnedGatewayPolicy(user.id, policyId)
  const accountId = await getPolicyCloudflareAccountId(user.id)

  await deleteGatewayRule(accountId, policy.cloudflareRuleId)
  await markOwnedGatewayPolicyDeleted(user.id, policyId)
  await createAdminAudit(user.id, "POLICY_DELETED", policyId)
}
