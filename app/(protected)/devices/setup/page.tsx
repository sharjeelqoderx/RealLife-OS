import { Suspense } from "react"

import { DeviceSetupView } from "@/app/(protected)/devices/_components/device-setup-view"
import { getDeviceEnrollmentInfo } from "@/lib/services/devices/get-enrollment-info"
import {
  devicePlatformSchema,
  type DevicePlatform,
} from "@/schemas/devices/device"

interface DeviceSetupPageProps {
  searchParams: Promise<{ platform?: string }>
}

function parsePlatform(value: string | undefined): DevicePlatform | null {
  const parsed = devicePlatformSchema.safeParse(value)
  return parsed.success ? parsed.data : null
}

export default async function DeviceSetupPage({
  searchParams,
}: DeviceSetupPageProps) {
  const { platform: platformParam } = await searchParams
  const initialPlatform = parsePlatform(platformParam)
  const enrollmentInfo = await getDeviceEnrollmentInfo().catch(() => null)

  return (
    <Suspense fallback={null}>
      <DeviceSetupView
        initialPlatform={initialPlatform}
        enrollmentInfo={enrollmentInfo}
      />
    </Suspense>
  )
}
