import {
  listGatewayAppTypes,
  type GatewayAppTypeEntry,
} from "@/lib/services/cloudflare/app-types"
import {
  listGatewayCategories,
  normalizeCategoryName,
  type GatewayCategory,
} from "@/lib/services/cloudflare/categories"
import type {
  GatewayPreset,
} from "@/schemas/content-policies/gateway-preset"
import type { GatewayPolicyType } from "@/schemas/content-policies/gateway-policy"

type PresetTemplate = {
  id: string
  type: GatewayPolicyType
  name: string
  description: string
  badgeText?: string
  /** Match Cloudflare category names (normalized includes). */
  categoryMatchers?: string[]
  /** Match Cloudflare application names (normalized includes). */
  appMatchers?: string[]
  domains?: string[]
}

/**
 * Curated RealLife OS presets. Resolved against live Cloudflare catalogs
 * (categories + apps) — Cloudflare has no presets API.
 */
const PRESET_TEMPLATES: PresetTemplate[] = [
  {
    id: "pr-adult",
    type: "block",
    name: "Adult Content",
    description:
      "Restrict access to pornographic content and adult-themed categories.",
    badgeText: "BLOCK",
    categoryMatchers: [
      "pornography",
      "adult themes",
      "nudity",
      "sex education",
      "adult",
    ],
  },
  {
    id: "pr-vpn",
    type: "block",
    name: "VPNs and Proxies",
    description:
      "Restrict access to VPN and Proxy services that can anonymize web traffic.",
    badgeText: "BLOCK",
    categoryMatchers: ["vpn", "proxy", "anonymizer", "tor"],
    appMatchers: ["vpn", "proxy", "tor"],
  },
  {
    id: "pr-security",
    type: "block",
    name: "Security Threats",
    description:
      "Prevent security threats like phishing, malware, and risky new domains.",
    badgeText: "BLOCK",
    categoryMatchers: [
      "phishing",
      "malware",
      "command and control",
      "spam",
      "new domains",
      "parked",
      "dns tunneling",
      "cryptomining",
    ],
  },
  {
    id: "pr-gambling",
    type: "block",
    name: "Gambling",
    description: "Block casino and gambling related content.",
    badgeText: "BLOCK",
    categoryMatchers: ["gambling", "casino"],
  },
  {
    id: "pr-social",
    type: "block",
    name: "Social Networking",
    description: "Block major social networking categories and apps.",
    badgeText: "BLOCK",
    categoryMatchers: ["social networking", "social media"],
    appMatchers: [
      "facebook",
      "instagram",
      "tiktok",
      "snapchat",
      "twitter",
      "reddit",
    ],
  },
  {
    id: "pr-streaming",
    type: "block",
    name: "Streaming Media",
    description: "Block online video and streaming entertainment.",
    badgeText: "BLOCK",
    categoryMatchers: ["online video", "streaming", "movies", "television"],
    appMatchers: ["youtube", "netflix", "twitch", "hulu", "disney"],
  },
  {
    id: "pr-games",
    type: "block",
    name: "Games",
    description: "Block gaming related content and popular game platforms.",
    badgeText: "BLOCK",
    categoryMatchers: ["games", "gaming"],
    appMatchers: ["roblox", "steam", "epic games", "minecraft"],
  },
  {
    id: "pr-google-maps",
    type: "block",
    name: "Google Maps",
    description: "Block Google Maps and related map hostnames.",
    badgeText: "BLOCK",
    domains: [
      "maps.google.com",
      "www.google.com",
      "maps.googleapis.com",
      "maps.gstatic.com",
    ],
    appMatchers: ["google maps"],
  },
  {
    id: "pr-apple-maps",
    type: "block",
    name: "Apple Maps",
    description: "Block Apple Maps related hostnames.",
    badgeText: "BLOCK",
    domains: ["maps.apple.com", "apple-mapkit.com"],
    appMatchers: ["apple maps"],
  },
  {
    id: "pr-safesearch",
    type: "safesearch",
    name: "Enforce SafeSearch",
    description:
      "Enforces SafeSearch if supported by a search engine.",
    badgeText: "SAFESEARCH",
  },
  {
    id: "pr-yt-restricted",
    type: "ytrestricted",
    name: "YouTube Restricted Mode",
    description:
      "Enforces restricted mode on YouTube to filter out mature content.",
    badgeText: "YT RESTRICTED",
    domains: [
      "youtube.com",
      "www.youtube.com",
      "m.youtube.com",
      "youtu.be",
    ],
  },
]

function flattenCategories(categories: GatewayCategory[]): GatewayCategory[] {
  const out: GatewayCategory[] = []
  for (const cat of categories) {
    out.push(cat)
    if (cat.subcategories?.length) {
      out.push(...flattenCategories(cat.subcategories))
    }
  }
  return out
}

function parentGroupLabel(
  roots: GatewayCategory[],
  childId: number
): string | undefined {
  for (const root of roots) {
    if (root.subcategories?.some((s) => s.id === childId)) {
      return root.name?.trim().toUpperCase()
    }
  }
  return undefined
}

function matchCategories(
  roots: GatewayCategory[],
  flat: GatewayCategory[],
  matchers: string[]
): GatewayPreset["categories"] {
  if (matchers.length === 0) return []
  const normalizedMatchers = matchers.map(normalizeCategoryName)
  const matched: GatewayPreset["categories"] = []

  for (const cat of flat) {
    if (cat.id == null || !cat.name) continue
    const name = normalizeCategoryName(cat.name)
    const hit = normalizedMatchers.some(
      (m) => name.includes(m) || m.includes(name)
    )
    if (!hit) continue
    matched.push({
      id: cat.id,
      name: cat.name.trim(),
      groupLabel: parentGroupLabel(roots, cat.id) ?? cat.name.trim().toUpperCase(),
    })
  }

  return matched
}

function matchApps(
  entries: GatewayAppTypeEntry[],
  matchers: string[]
): GatewayPreset["apps"] {
  if (matchers.length === 0) return []
  const normalizedMatchers = matchers.map(normalizeCategoryName)
  const typeNameById = new Map<number, string>()

  for (const entry of entries) {
    if (entry.id == null || !entry.name) continue
    if (entry.application_type_id == null) {
      typeNameById.set(entry.id, entry.name.trim().toUpperCase())
    }
  }

  const matched: GatewayPreset["apps"] = []
  for (const entry of entries) {
    if (entry.id == null || !entry.name || entry.application_type_id == null) {
      continue
    }
    const name = normalizeCategoryName(entry.name)
    const hit = normalizedMatchers.some(
      (m) => name.includes(m) || m.includes(name)
    )
    if (!hit) continue
    matched.push({
      id: entry.id,
      name: entry.name.trim(),
      groupLabel:
        typeNameById.get(entry.application_type_id) ?? "APPLICATIONS",
    })
  }

  return matched
}

/**
 * Build presets by resolving curated templates against live Cloudflare
 * Gateway categories and applications for the account.
 */
export async function listGatewayPresets(
  accountId: string
): Promise<GatewayPreset[]> {
  const [categories, appEntries] = await Promise.all([
    listGatewayCategories(accountId),
    listGatewayAppTypes(accountId).catch((error) => {
      console.warn("listGatewayPresets: apps unavailable:", error)
      return [] as GatewayAppTypeEntry[]
    }),
  ])

  const flat = flattenCategories(categories)
  const presets: GatewayPreset[] = []

  for (const template of PRESET_TEMPLATES) {
    const matchedCategories = matchCategories(
      categories,
      flat,
      template.categoryMatchers ?? []
    )
    const matchedApps = matchApps(appEntries, template.appMatchers ?? [])
    const domains = template.domains ?? []

    const isActionOnly =
      template.type === "safesearch" || template.type === "ytrestricted"

    if (
      !isActionOnly &&
      matchedCategories.length === 0 &&
      matchedApps.length === 0 &&
      domains.length === 0
    ) {
      continue
    }

    presets.push({
      id: template.id,
      type: template.type,
      name: template.name,
      description: template.description,
      badgeText: template.badgeText,
      categories: matchedCategories,
      apps: matchedApps,
      domains,
    })
  }

  return presets
}
