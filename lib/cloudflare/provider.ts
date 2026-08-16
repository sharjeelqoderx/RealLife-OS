import type {
  CloudflarePhysicalDevice,
  CloudflareRegistration,
} from "@/lib/services/cloudflare/devices"
import type {
  CreateGatewayRuleInput,
  GatewayRule,
  UpdateGatewayRuleInput,
} from "@/lib/services/cloudflare/rules"

/**
 * Adapter boundary so production uses live Cloudflare APIs while tests use
 * an in-memory mock without touching the shared Zero Trust account.
 */
export interface CloudflareProvider {
  listPhysicalDevices(): Promise<CloudflarePhysicalDevice[]>
  getPhysicalDevice(id: string): Promise<CloudflarePhysicalDevice>
  deletePhysicalDevice(id: string): Promise<void>
  revokePhysicalDevice(id: string): Promise<void>
  listRegistrations(): Promise<CloudflareRegistration[]>
  getRegistration(id: string): Promise<CloudflareRegistration>
  listGatewayRules(): Promise<GatewayRule[]>
  createGatewayRule(input: CreateGatewayRuleInput): Promise<GatewayRule>
  updateGatewayRule(id: string, input: UpdateGatewayRuleInput): Promise<GatewayRule>
  deleteGatewayRule(id: string): Promise<void>
}
