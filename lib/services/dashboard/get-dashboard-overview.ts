import { listOwnedGatewayPolicies } from "@/lib/services/content-policies/policy-ownership"
import { requireAuthenticatedUserId } from "@/lib/services/devices/context"
import { listDeviceProfiles } from "@/lib/services/devices/device-profiles"
import { listConnectedDevices } from "@/lib/services/devices/list-connected-devices"
import type { DevicePlatform } from "@/schemas/devices/device"

export type DashboardDeviceItem = {
  id: string
  name: string
  platform: DevicePlatform
  status: "active" | "inactive"
  lastSeenMinutes: number
}

export type DashboardOverview = {
  devices: DashboardDeviceItem[]
  deviceCount: number
  androidCount: number
  iphoneCount: number
  connectedDeviceCount: number
  protectedDeviceCount: number
  policyCount: number
  profileCount: number
}

/**
 * Dashboard numbers for the signed-in SaaS user only.
 * Never mixes in the shared Zero Trust inventory or demo metrics.
 */
export async function getDashboardOverview(): Promise<DashboardOverview> {
  const userId = await requireAuthenticatedUserId()

  const [devices, ownedPolicies, profiles] = await Promise.all([
    listConnectedDevices().catch(() => []),
    listOwnedGatewayPolicies(userId).catch(() => []),
    listDeviceProfiles().catch(() => []),
  ])

  const androidCount = devices.filter((device) => device.platform === "android")
    .length
  const iphoneCount = devices.filter((device) => device.platform === "iphone")
    .length
  const connectedDeviceCount = devices.filter(
    (device) => device.protectionStatus === "connected"
  ).length
  const protectedDeviceCount = devices.filter(
    (device) => device.gatewayStatus === "protected"
  ).length

  return {
    devices: devices.map((device) => ({
      id: device.id,
      name: device.name,
      platform: device.platform,
      status: device.status,
      lastSeenMinutes: device.lastSeenMinutes,
    })),
    deviceCount: devices.length,
    androidCount,
    iphoneCount,
    connectedDeviceCount,
    protectedDeviceCount,
    policyCount: ownedPolicies.length,
    profileCount: profiles.length,
  }
}
