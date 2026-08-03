import type { PickerGroupDto } from "@/lib/services/cloudflare/category-picker"
import {
  listGatewayLocations,
  type GatewayLocation,
} from "@/lib/services/cloudflare/locations"

export function mapLocationsToPickerGroups(
  locations: GatewayLocation[]
): PickerGroupDto[] {
  const items = locations
    .filter((loc) => Boolean(loc.id) && Boolean(loc.name?.trim()))
    .map((loc) => ({
      id: loc.id as string,
      label: loc.client_default
        ? `${loc.name!.trim()} (default)`
        : loc.name!.trim(),
    }))
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
  accountId: string
): Promise<PickerGroupDto[]> {
  const locations = await listGatewayLocations(accountId)
  return mapLocationsToPickerGroups(locations)
}
