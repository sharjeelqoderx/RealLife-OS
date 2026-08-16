/**
 * Maps customer-facing protection categories to Cloudflare Gateway content
 * category names used when building wirefilter expressions.
 *
 * Exact numeric category IDs are resolved at runtime from the Cloudflare
 * Gateway categories API (`listGatewayCategories`) so we do not invent IDs.
 */
export const CLOUDFLARE_CATEGORY_MAP = {
  malware: "Malware",
  phishing: "Phishing",
  adult: "Adult Themes",
  gambling: "Gambling",
  social_media: "Social Networking",
  cryptomining: "Cryptomining",
  newly_seen_domains: "Newly Seen Domains",
} as const

export type AppProtectionCategory = keyof typeof CLOUDFLARE_CATEGORY_MAP

export function getCloudflareCategoryLabel(
  category: AppProtectionCategory
): string {
  return CLOUDFLARE_CATEGORY_MAP[category]
}
