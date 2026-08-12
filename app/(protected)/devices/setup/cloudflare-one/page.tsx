import { CloudflareOneWizard } from "@/app/(protected)/devices/_components/cloudflare-one-wizard"
import { getDeviceAppPreferences } from "@/lib/services/devices/app-preferences"
import { getDeviceEnrollmentInfo } from "@/lib/services/devices/get-enrollment-info"
import { getDeviceSetupSession } from "@/lib/services/devices/setup-session"
import {
  devicePlatformSchema,
  type DevicePlatform,
} from "@/schemas/devices/device"

interface CloudflareOneSetupPageProps {
  searchParams: Promise<{ platform?: string }>
}

function parsePlatform(value: string | undefined): DevicePlatform {
  const parsed = devicePlatformSchema.safeParse(value)
  return parsed.success ? parsed.data : "android"
}

export default async function CloudflareOneSetupPage({
  searchParams,
}: CloudflareOneSetupPageProps) {
  const { platform: platformParam } = await searchParams
  const platform = parsePlatform(platformParam)

  const [enrollmentInfo, setupSession, appPreferences] = await Promise.all([
    getDeviceEnrollmentInfo().catch(() => null),
    getDeviceSetupSession(platform).catch(() => ({
      platform,
      answers: {},
      cloudflareWizardStep: 1,
      updatedAt: new Date(0).toISOString(),
    })),
    getDeviceAppPreferences().catch(() => ({
      lockFilterSwitch: true,
      preventLogout: true,
      updatedAt: new Date(0).toISOString(),
    })),
  ])

  return (
    <CloudflareOneWizard
      platform={platform}
      initialStep={setupSession.cloudflareWizardStep}
      enrollmentInfo={enrollmentInfo}
      initialAppPreferences={appPreferences}
    />
  )
}
