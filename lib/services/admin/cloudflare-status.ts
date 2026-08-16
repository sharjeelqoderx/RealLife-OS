import {
  hasCloudflarePlatformConfig,
  tryGetCloudflareAccountId,
  tryGetCloudflareApiToken,
} from "@/lib/cloudflare/config"
import { createLiveCloudflareProvider } from "@/lib/cloudflare/providers/live"

export async function getAdminCloudflareStatus(): Promise<{
  cloudflare: {
    connected: boolean
    devicesApi: boolean
    gatewayApi: boolean
    accountConfigured: boolean
    tokenConfigured: boolean
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
      },
    }
  }

  const provider = createLiveCloudflareProvider()
  let devicesApi = false
  let gatewayApi = false

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

  return {
    cloudflare: {
      connected: devicesApi || gatewayApi,
      devicesApi,
      gatewayApi,
      accountConfigured,
      tokenConfigured,
    },
  }
}
