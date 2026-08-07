import type { GatewaySchedule } from "@/lib/services/cloudflare/rules"

export type ParsedTrafficSelectors = {
  categoryIds: number[]
  appIds: number[]
  locationIds: string[]
  /** Exact hosts → Address tab / dns.fqdn */
  hosts: string[]
  /** Domain roots → Auto-Detect / dns.domains */
  domainRoots: string[]
  /** Keyword substrings → Keyword tab / matches regex */
  keywords: string[]
}

export type ParsedScheduleBlock = {
  dayIndex: number
  startHour: number
  startMinute: number
  durationMinutes: number
}

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const

function extractQuotedStrings(raw: string): string[] {
  const matches = raw.matchAll(/"([^"]+)"/g)
  return [...matches].map((m) => m[1]!).filter(Boolean)
}

function extractNumbers(raw: string): number[] {
  return [...raw.matchAll(/\d+/g)]
    .map((m) => Number(m[0]))
    .filter((n) => Number.isFinite(n) && n > 0)
}

function unescapeWirefilterRegex(value: string): string {
  return value.replace(/\\([.*+?^${}()|[\]\\])/g, "$1")
}

function parseKeywordPattern(pattern: string): string[] {
  return pattern
    .split("|")
    .map((part) => {
      let s = part.trim()
      if (s.startsWith(".*")) s = s.slice(2)
      if (s.endsWith(".*")) s = s.slice(0, -2)
      return unescapeWirefilterRegex(s).trim().toLowerCase()
    })
    .filter((s) => s.length > 0)
}

/**
 * Best-effort parse of Gateway wirefilter `traffic` back into editor selectors.
 * Covers expressions produced by our builders and Cloudflare's formatted API output.
 */
export function parseTrafficExpression(
  traffic: string | null | undefined
): ParsedTrafficSelectors {
  const result: ParsedTrafficSelectors = {
    categoryIds: [],
    appIds: [],
    locationIds: [],
    hosts: [],
    domainRoots: [],
    keywords: [],
  }

  if (!traffic?.trim()) return result
  // Normalize curly/smart quotes Cloudflare sometimes returns.
  const t = traffic.replace(/[“”]/g, '"').replace(/[‘’]/g, "'")

  const pushCats = (raw: string) => {
    result.categoryIds.push(...extractNumbers(raw))
  }
  const pushApps = (raw: string) => {
    result.appIds.push(...extractNumbers(raw))
  }

  for (const m of t.matchAll(
    /any\(\s*dns\.(?:content_category|security_category)\[\*\]\s+in\s+\{([^}]+)\}\s*\)/g
  )) {
    if (m[1]) pushCats(m[1])
  }
  for (const m of t.matchAll(
    /any\(\s*dns\.(?:content_category|security_category)\[\*\]\s*==\s*(\d+)\s*\)/g
  )) {
    if (m[1]) pushCats(m[1])
  }

  for (const m of t.matchAll(
    /any\(\s*app\.ids\[\*\]\s+in\s+\{([^}]+)\}\s*\)/g
  )) {
    if (m[1]) pushApps(m[1])
  }
  for (const m of t.matchAll(/any\(\s*app\.ids\[\*\]\s*==\s*(\d+)\s*\)/g)) {
    if (m[1]) pushApps(m[1])
  }

  for (const m of t.matchAll(/dns\.location\s*==\s*"([^"]+)"/g)) {
    if (m[1]) result.locationIds.push(m[1])
  }
  const locationIn = t.match(/dns\.location\s+in\s+\{([^}]+)\}/)
  if (locationIn?.[1]) {
    const quoted = extractQuotedStrings(locationIn[1])
    if (quoted.length > 0) result.locationIds.push(...quoted)
    else {
      result.locationIds.push(
        ...locationIn[1]
          .split(/\s+/)
          .map((s) => s.trim())
          .filter(Boolean)
      )
    }
  }

  for (const m of t.matchAll(/dns\.fqdn\s*==\s*"([^"]+)"/g)) {
    if (m[1]) result.hosts.push(m[1].toLowerCase())
  }
  const fqdnIn = t.match(/dns\.fqdn\s+in\s+\{([^}]+)\}/)
  if (fqdnIn?.[1]) {
    const quoted = extractQuotedStrings(fqdnIn[1])
    if (quoted.length > 0) {
      result.hosts.push(...quoted.map((h) => h.toLowerCase()))
    } else {
      result.hosts.push(
        ...fqdnIn[1]
          .split(/\s+/)
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean)
      )
    }
  }

  const fqdnMatches = t.match(/dns\.fqdn\s+matches\s+"([^"]+)"/)
  if (fqdnMatches?.[1]) {
    result.keywords.push(...parseKeywordPattern(fqdnMatches[1]))
  }

  for (const m of t.matchAll(
    /any\(\s*dns\.domains\[\*\]\s*==\s*"([^"]+)"\s*\)/g
  )) {
    if (m[1]) result.domainRoots.push(m[1].toLowerCase())
  }
  for (const m of t.matchAll(
    /any\(\s*dns\.domains\[\*\]\s+in\s+\{([^}]+)\}\s*\)/g
  )) {
    if (!m[1]) continue
    const quoted = extractQuotedStrings(m[1])
    if (quoted.length > 0) {
      result.domainRoots.push(...quoted.map((d) => d.toLowerCase()))
    } else {
      result.domainRoots.push(
        ...m[1]
          .split(/\s+/)
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean)
      )
    }
  }

  result.categoryIds = [...new Set(result.categoryIds)]
  result.appIds = [...new Set(result.appIds)]
  result.locationIds = [...new Set(result.locationIds)]
  result.hosts = [...new Set(result.hosts)]
  result.domainRoots = [...new Set(result.domainRoots)]
  result.keywords = [...new Set(result.keywords)]

  return result
}

function parseDayRange(
  dayIndex: number,
  range: string
): ParsedScheduleBlock | null {
  const m = range
    .trim()
    .match(
      /^(\d{1,2}):(\d{2})(?::\d{2})?\s*-\s*(\d{1,2}):(\d{2})(?::\d{2})?$/
    )
  if (!m) return null
  const startHour = Number(m[1])
  const startMinute = Number(m[2])
  const endHour = Number(m[3])
  const endMinute = Number(m[4])
  if (
    ![startHour, startMinute, endHour, endMinute].every((n) =>
      Number.isFinite(n)
    )
  ) {
    return null
  }
  let start = startHour * 60 + startMinute
  let end = endHour * 60 + endMinute
  if (end <= start) end += 24 * 60
  const durationMinutes = end - start
  if (durationMinutes < 15) return null
  return {
    dayIndex,
    startHour,
    startMinute,
    durationMinutes: Math.min(durationMinutes, 24 * 60),
  }
}

/** Convert Cloudflare Gateway schedule → editor schedule blocks. */
export function parseGatewaySchedule(
  schedule: GatewaySchedule | null | undefined
): { blocks: ParsedScheduleBlock[]; timeZone?: string } {
  if (!schedule) return { blocks: [] }

  const blocks: ParsedScheduleBlock[] = []
  DAY_KEYS.forEach((key, dayIndex) => {
    const raw = schedule[key]
    if (!raw?.trim()) return
    for (const part of raw.split(",")) {
      const block = parseDayRange(dayIndex, part)
      if (block) blocks.push(block)
    }
  })

  return {
    blocks,
    timeZone: schedule.time_zone?.trim() || undefined,
  }
}
