import { ConnectedDevicesView } from "@/app/(protected)/devices/_components/connected-devices-view"
import { listConnectedDevices } from "@/lib/services/devices/list-connected-devices"
import { getDeviceEnrollmentInfo } from "@/lib/services/devices/get-enrollment-info"
import type { DeviceEnrollmentInfo } from "@/schemas/devices/api"

const emptyEnrollmentInfo: DeviceEnrollmentInfo = {
  tenantReady: false,
  hasAccess: false,
  teamName: null,
  teamDomain: null,
  installEmails: [],
  dnsProfileAvailable: false,
  dohSubdomain: null,
  gatewayPolicyCount: 0,
  enrolledDeviceCount: 0,
  deviceLimit: 0,
  remainingDeviceSlots: 0,
  canAddDevice: false,
  planName: "Subscription",
  limitSource: "none",
  storeUrls: {
    android:
      "https://play.google.com/store/apps/details?id=com.cloudflare.cloudflareone",
    iphone: "https://apps.apple.com/app/cloudflare-one/id6443476492",
  },
  warpDownloadUrls: {
    macos: "https://downloads.cloudflareclient.com/v1/download/macos/ga",
    windows: "https://downloads.cloudflareclient.com/v1/download/windows/ga",
  },
}

export default async function DevicesPage() {
  const [devices, enrollmentInfo] = await Promise.all([
    listConnectedDevices().catch(() => []),
    getDeviceEnrollmentInfo().catch(() => emptyEnrollmentInfo),
  ])

  return (
    <ConnectedDevicesView
      initialDevices={devices}
      enrollmentInfo={enrollmentInfo}
    />
  )
}
