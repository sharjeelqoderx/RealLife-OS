import { z } from "zod"

export const gatewayPolicyTypeSchema = z.enum([
  "allow",
  "block",
  "ytrestricted",
  "safesearch",
])

export const gatewayScheduleBlockSchema = z.object({
  dayIndex: z.number().int().min(0).max(6),
  startHour: z.number().int().min(0).max(23),
  startMinute: z.number().int().min(0).max(59),
  durationMinutes: z.number().int().min(15).max(24 * 60),
})

/**
 * Payload from the shared policy editor (create/edit) → Gateway DNS rule.
 * Maps Phase 1 §3.2 features: categories, allow/block domains, SafeSearch,
 * YouTube Restricted, schedules, optional per-device (Gateway location) scope.
 */
export const createGatewayPolicySchema = z
  .object({
    name: z.string().trim().min(1, "Policy name is required").max(120),
    type: gatewayPolicyTypeSchema,
    description: z.string().trim().max(500).optional(),
    enabled: z.boolean().optional().default(true),
    /** Content category labels from the UI picker (resolved to CF IDs server-side). */
    categories: z.array(z.string().trim().min(1)).default([]),
    /** Explicit Cloudflare category IDs when already known. */
    categoryIds: z.array(z.number().int().positive()).default([]),
    /**
     * Exact hostnames (Address tab) → `dns.fqdn`.
     * Also accepts legacy flat domain lists.
     */
    domains: z.array(z.string().trim().min(1)).default([]),
    /**
     * Domain roots (Auto-Detect tab) → Domain selector incl. subdomains.
     * `any(dns.domains[*] …)`
     */
    domainRoots: z.array(z.string().trim().min(1)).default([]),
    /**
     * Keyword substrings (Keyword tab) → `dns.fqdn matches ".*kw.*"`.
     */
    domainKeywords: z.array(z.string().trim().min(1)).default([]),
    /** App labels — mapped to known domains when app IDs unavailable (DNS fallback). */
    apps: z.array(z.string().trim().min(1)).default([]),
    /** Cloudflare Gateway application IDs from `/gateway/app_types`. */
    appIds: z.array(z.number().int().positive()).default([]),
    /**
     * Per-device / per-profile: Gateway DNS location UUIDs.
     * @see dns.location selector
     */
    locationIds: z.array(z.string().trim().min(1)).default([]),
    schedules: z.array(gatewayScheduleBlockSchema).default([]),
    timeZone: z.string().trim().min(1).optional(),
    precedence: z.number().int().positive().optional(),
  })
  .superRefine((value, ctx) => {
    if (hasGatewayPolicyTrafficSelectors(value)) {
      return
    }

    ctx.addIssue({
      code: "custom",
      message:
        "Add at least one category, app, web address, or audience location",
      path: ["domains"],
    })
  })

export type CreateGatewayPolicyInput = z.infer<typeof createGatewayPolicySchema>
export type GatewayPolicyType = z.infer<typeof gatewayPolicyTypeSchema>

/** Shared create/edit guard — SafeSearch / YT Restricted skip selector requirement. */
export function hasGatewayPolicyTrafficSelectors(value: {
  type: GatewayPolicyType
  categories: readonly string[]
  categoryIds: readonly number[]
  domains: readonly string[]
  domainRoots: readonly string[]
  domainKeywords: readonly string[]
  apps: readonly string[]
  appIds: readonly number[]
  locationIds: readonly string[]
}): boolean {
  if (value.type === "safesearch" || value.type === "ytrestricted") {
    return true
  }

  return (
    value.categories.length > 0 ||
    value.categoryIds.length > 0 ||
    value.domains.length > 0 ||
    value.domainRoots.length > 0 ||
    value.domainKeywords.length > 0 ||
    value.apps.length > 0 ||
    value.appIds.length > 0 ||
    value.locationIds.length > 0
  )
}

export function isCreateGatewayPolicyPayloadValid(
  value: unknown
): value is CreateGatewayPolicyInput {
  return createGatewayPolicySchema.safeParse(value).success
}
