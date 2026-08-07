import type { PickerGroupDto } from "@/lib/services/cloudflare/category-picker"
import {
  listGatewayLocations,
  type GatewayLocation,
} from "@/lib/services/cloudflare/locations"

function locationDescription(loc: GatewayLocation): string | undefined {
  const parts: string[] = []
  if (loc.doh_subdomain?.trim()) {
    parts.push(`${loc.doh_subdomain.trim()}.cloudflare-gateway.com`)
  }
  if (loc.ipv4_destination?.trim()) {
    parts.push(loc.ipv4_destination.trim())
  }
  return parts.length > 0 ? parts.join(" · ") : undefined
}

function locationKeywords(loc: GatewayLocation): string {
  return [
    loc.id,
    loc.name,
    loc.doh_subdomain,
    loc.ipv4_destination,
    loc.ipv4_destination_backup,
    loc.ip,
    loc.client_default ? "default" : "",
  ]
    .filter(Boolean)
    .join(" ")
}

export function mapLocationsToPickerGroups(
  locations: GatewayLocation[],
  searchQuery?: string
): PickerGroupDto[] {
  const q = searchQuery?.trim().toLowerCase() ?? ""

  const items = locations
    .filter((loc) => Boolean(loc.id) && Boolean(loc.name?.trim()))
    .map((loc) => {
      const label = loc.client_default
        ? `${loc.name!.trim()} (default)`
        : loc.name!.trim()
      const description = locationDescription(loc)
      const keywords = locationKeywords(loc)
      return {
        id: loc.id as string,
        label,
        description,
        keywords,
      }
    })
    .filter((item) => {
      if (!q) return true
      const haystack = [item.label, item.description, item.keywords]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return haystack.includes(q)
    })
    .sort((a, b) => a.label.localeCompare(b.label))

  if (items.length === 0) return []

  return [
    {
      id: "locations",
      label: "DNS LOCATIONS",
      items,
    },
  ]
}

export async function listGatewayAudiencePickerGroups(
  accountId: string,
  searchQuery?: string
): Promise<PickerGroupDto[]> {
  const locations = await listGatewayLocations(accountId)
  return mapLocationsToPickerGroups(locations, searchQuery)
}
