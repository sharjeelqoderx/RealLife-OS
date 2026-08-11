import { DeviceSetupView } from "@/app/(protected)/devices/_components/device-setup-view"
import { getDeviceEnrollmentInfo } from "@/lib/services/devices/get-enrollment-info"
import { getDeviceSetupSession } from "@/lib/services/devices/setup-session"
import {
  devicePlatformSchema,
  type DevicePlatform,
} from "@/schemas/devices/device"

interface DeviceSetupPageProps {
  searchParams: Promise<{ platform?: string }>
}

function parsePlatform(value: string | undefined): DevicePlatform {
  const parsed = devicePlatformSchema.safeParse(value)
  return parsed.success ? parsed.data : "android"
}

export default async function DeviceSetupPage({
  searchParams,
}: DeviceSetupPageProps) {
  const { platform: platformParam } = await searchParams
  const platform = parsePlatform(platformParam)

  const [setupSession, enrollmentInfo] = await Promise.all([
    getDeviceSetupSession(platform).catch(() => ({
      platform,
      answers: {},
      cloudflareWizardStep: 1,
      updatedAt: new Date(0).toISOString(),
    })),
    getDeviceEnrollmentInfo().catch(() => null),
  ])

  return (
    <DeviceSetupView
      initialPlatform={platform}
      initialSession={setupSession}
      enrollmentInfo={enrollmentInfo}
    />
  )
}
