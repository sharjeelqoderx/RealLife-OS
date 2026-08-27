import {
  hasCloudflarePlatformConfig,
  tryGetCloudflareAccountId,
  tryGetCloudflareApiToken,
} from "@/lib/cloudflare/config"
import { createLiveCloudflareProvider } from "@/lib/cloudflare/providers/live"
import {
  getDefaultDevicePolicy,
  readTrafficAndDnsProfileStatus,
  type TrafficAndDnsProfileStatus,
} from "@/lib/services/cloudflare/device-policy"

export async function getAdminCloudflareStatus(): Promise<{
  cloudflare: {
    connected: boolean
    devicesApi: boolean
    gatewayApi: boolean
    accountConfigured: boolean
    tokenConfigured: boolean
    trafficAndDns: boolean
    deviceProfile: TrafficAndDnsProfileStatus | null
  }
}> {
  const accountConfigured = Boolean(tryGetCloudflareAccountId())
  const tokenConfigured = Boolean(tryGetCloudflareApiToken())

  if (!hasCloudflarePlatformConfig()) {
    return {
      cloudflare: {
        connected: false,
        devicesApi: false,
        gatewayApi: false,
        accountConfigured,
        tokenConfigured,
        trafficAndDns: false,
        deviceProfile: null,
      },
    }
  }

  const provider = createLiveCloudflareProvider()
  let devicesApi = false
  let gatewayApi = false
  let deviceProfile: TrafficAndDnsProfileStatus | null = null

  try {
    await provider.listPhysicalDevices()
    devicesApi = true
  } catch {
    devicesApi = false
  }

  try {
    await provider.listGatewayRules()
    gatewayApi = true
  } catch {
    gatewayApi = false
  }

  try {
    const accountId = tryGetCloudflareAccountId()
    if (accountId) {
      const policy = await getDefaultDevicePolicy(accountId)
      deviceProfile = readTrafficAndDnsProfileStatus(policy)
    }
  } catch {
    deviceProfile = null
  }

  return {
    cloudflare: {
      connected: devicesApi || gatewayApi,
      devicesApi,
      gatewayApi,
      accountConfigured,
      tokenConfigured,
      trafficAndDns: deviceProfile?.trafficAndDns === true,
      deviceProfile,
    },
  }
}
