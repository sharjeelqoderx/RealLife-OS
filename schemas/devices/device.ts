import { z } from "zod"

export const devicePlatformSchema = z.enum(["android", "iphone"])
export type DevicePlatform = z.infer<typeof devicePlatformSchema>

export const connectedDeviceSchema = z.object({
  id: z.string().min(1),
  registrationId: z.string().nullable().optional(),
  name: z.string().min(1),
  platform: devicePlatformSchema,
  status: z.enum(["active", "inactive"]),
  lastSeenMinutes: z.number().int().nonnegative(),
  deviceType: z.string().nullable().optional(),
  model: z.string().nullable().optional(),
  osVersion: z.string().nullable().optional(),
  userEmail: z.string().nullable().optional(),
})

export type ConnectedDevice = z.infer<typeof connectedDeviceSchema>

export const deviceSetupAnswersSchema = z.object({
  isManaged: z.enum(["yes", "no"]).optional(),
  isConnectedToPolicy: z.enum(["yes", "no"]).optional(),
  certificateInstalled: z.enum(["yes", "no", "skip"]).optional(),
})

export type DeviceSetupAnswers = z.infer<typeof deviceSetupAnswersSchema>

export const CLOUDFLARE_ONE_CLIENT_DOCS =
  "https://developers.cloudflare.com/cloudflare-one/team-and-resources/devices/cloudflare-one-client/"

export const CLOUDFLARE_MANAGED_ANDROID_DOCS =
  "https://developers.cloudflare.com/cloudflare-one/team-and-resources/devices/warp/deployment/mdm/"

export const DNS_LEAK_TEST_URL = "https://dnsleaktest.com/"

export const PLAY_STORE_CLOUDFLARE_ONE =
  "https://play.google.com/store/apps/details?id=com.cloudflare.cloudflareone"

export const APP_STORE_CLOUDFLARE_ONE =
  "https://apps.apple.com/app/cloudflare-one/id6443476492"

export const MOCK_TEAM_NAME = "sully-u-7"

export const MOCK_INSTALL_EMAILS = [
  "p.sully@icloud.com",
  "admin@securedns.io",
  "family@securedns.io",
] as const

export const MOCK_LOGIN_PIN = "123456"

export const MOCK_DNS_LEAK_RESULT = {
  ip: "172.68.65.138",
  hostname: "none",
  isp: "Cloudflare",
  country: "United States",
} as const

export const MOCK_CONNECTED_DEVICES: ConnectedDevice[] = [
  {
    id: "1",
    registrationId: null,
    name: "My iPhone 13",
    platform: "iphone",
    status: "active",
    lastSeenMinutes: 2,
  },
  {
    id: "2",
    registrationId: null,
    name: "Son iPhone 14",
    platform: "iphone",
    status: "active",
    lastSeenMinutes: 15,
  },
  {
    id: "3",
    registrationId: null,
    name: "Mom Galaxy X",
    platform: "android",
    status: "active",
    lastSeenMinutes: 60,
  },
]

export function formatLastSeen(minutes: number): string {
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function getPlatformLabel(platform: DevicePlatform): string {
  return platform === "android" ? "Android" : "iPhone"
}

export function getStoreLabel(platform: DevicePlatform): string {
  return platform === "android" ? "Play Store" : "App Store"
}

export function getStoreUrl(platform: DevicePlatform): string {
  return platform === "android" ? PLAY_STORE_CLOUDFLARE_ONE : APP_STORE_CLOUDFLARE_ONE
}
