import { getCloudflareAccountId } from "@/lib/cloudflare/config"
import type { CloudflareProvider } from "@/lib/cloudflare/provider"
import {
  deletePhysicalDevice,
  getPhysicalDevice,
  getRegistration,
  listPhysicalDevices,
  listRegistrations,
  revokePhysicalDevice,
} from "@/lib/services/cloudflare/devices"
import {
  createGatewayRule,
  deleteGatewayRule,
  listGatewayRules,
  updateGatewayRule,
  type CreateGatewayRuleInput,
  type UpdateGatewayRuleInput,
} from "@/lib/services/cloudflare/rules"

export function createLiveCloudflareProvider(): CloudflareProvider {
  const accountId = getCloudflareAccountId()

  return {
    listPhysicalDevices: () => listPhysicalDevices(accountId),
    getPhysicalDevice: (id) => getPhysicalDevice(accountId, id),
    deletePhysicalDevice: (id) => deletePhysicalDevice(accountId, id),
    revokePhysicalDevice: (id) => revokePhysicalDevice(accountId, id),
    listRegistrations: () => listRegistrations(accountId),
    getRegistration: (id) => getRegistration(accountId, id),
    listGatewayRules: () => listGatewayRules(accountId),
    createGatewayRule: (input: CreateGatewayRuleInput) =>
      createGatewayRule(accountId, input),
    updateGatewayRule: (id: string, input: UpdateGatewayRuleInput) =>
      updateGatewayRule(accountId, id, input),
    deleteGatewayRule: (id: string) => deleteGatewayRule(accountId, id),
  }
}
