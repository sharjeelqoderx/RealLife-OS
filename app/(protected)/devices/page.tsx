import { ConnectedDevicesView } from "@/app/(protected)/devices/_components/connected-devices-view"
import { listConnectedDevices } from "@/lib/services/devices/list-connected-devices"
import { getDeviceEnrollmentInfo } from "@/lib/services/devices/get-enrollment-info"

export default async function DevicesPage() {
  const [devices, enrollmentInfo] = await Promise.all([
    listConnectedDevices().catch(() => []),
    getDeviceEnrollmentInfo().catch(() => ({
      tenantReady: false,
      teamName: null,
      installEmails: [],
      dnsProfileAvailable: false,
      dohSubdomain: null,
      gatewayPolicyCount: 0,
      enrolledDeviceCount: 0,
      storeUrls: {
        android:
          "https://play.google.com/store/apps/details?id=com.cloudflare.cloudflareone",
        iphone: "https://apps.apple.com/app/cloudflare-one/id6443476492",
      },
      warpDownloadUrls: {
        macos: "https://downloads.cloudflareclient.com/v1/download/macos/ga",
        windows: "https://downloads.cloudflareclient.com/v1/download/windows/ga",
      },
    })),
  ])

  return (
    <ConnectedDevicesView
      initialDevices={devices}
      enrollmentInfo={enrollmentInfo}
    />
  )
}
