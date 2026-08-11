import { InstallCertificateView } from "@/app/(protected)/devices/_components/install-certificate-view"
import { getDeviceEnrollmentInfo } from "@/lib/services/devices/get-enrollment-info"
import {
  devicePlatformSchema,
  type DevicePlatform,
} from "@/schemas/devices/device"

interface InstallCertificatePageProps {
  searchParams: Promise<{ platform?: string }>
}

function parsePlatform(value: string | undefined): DevicePlatform {
  const parsed = devicePlatformSchema.safeParse(value)
  return parsed.success ? parsed.data : "iphone"
}

export default async function InstallCertificatePage({
  searchParams,
}: InstallCertificatePageProps) {
  const { platform: platformParam } = await searchParams
  const platform = parsePlatform(platformParam)

  const enrollmentInfo = await getDeviceEnrollmentInfo().catch(() => null)

  return (
    <InstallCertificateView
      platform={platform}
      warpDownloadUrls={
        enrollmentInfo?.warpDownloadUrls ?? {
          macos: "https://downloads.cloudflareclient.com/v1/download/macos/ga",
          windows: "https://downloads.cloudflareclient.com/v1/download/windows/ga",
        }
      }
      dnsProfileAvailable={enrollmentInfo?.dnsProfileAvailable ?? false}
    />
  )
}
