import type { CloudflareProvider } from "@/lib/cloudflare/provider"
import type {
  CloudflarePhysicalDevice,
  CloudflareRegistration,
} from "@/lib/services/cloudflare/devices"
import type {
  CreateGatewayRuleInput,
  GatewayRule,
  UpdateGatewayRuleInput,
} from "@/lib/services/cloudflare/rules"

export class MockCloudflareProvider implements CloudflareProvider {
  devices = new Map<string, CloudflarePhysicalDevice>()
  registrations = new Map<string, CloudflareRegistration>()
  rules = new Map<string, GatewayRule>()

  async listPhysicalDevices(): Promise<CloudflarePhysicalDevice[]> {
    return [...this.devices.values()]
  }

  async getPhysicalDevice(id: string): Promise<CloudflarePhysicalDevice> {
    const device = this.devices.get(id)
    if (!device) throw new Error(`Device not found: ${id}`)
    return device
  }

  async deletePhysicalDevice(id: string): Promise<void> {
    this.devices.delete(id)
  }

  async revokePhysicalDevice(id: string): Promise<void> {
    const device = await this.getPhysicalDevice(id)
    this.devices.set(id, { ...device, active_registrations: 0 })
  }

  async listRegistrations(): Promise<CloudflareRegistration[]> {
    return [...this.registrations.values()]
  }

  async getRegistration(id: string): Promise<CloudflareRegistration> {
    const registration = this.registrations.get(id)
    if (!registration) throw new Error(`Registration not found: ${id}`)
    return registration
  }

  async listGatewayRules(): Promise<GatewayRule[]> {
    return [...this.rules.values()]
  }

  async createGatewayRule(input: CreateGatewayRuleInput): Promise<GatewayRule> {
    const rule: GatewayRule = {
      id: `rule_${this.rules.size + 1}`,
      name: input.name,
      action: input.action,
      enabled: input.enabled ?? true,
      filters: input.filters ?? ["dns"],
      traffic: input.traffic,
      precedence: input.precedence,
      description: input.description,
    }
    this.rules.set(rule.id!, rule)
    return rule
  }

  async updateGatewayRule(
    id: string,
    input: UpdateGatewayRuleInput
  ): Promise<GatewayRule> {
    const existing = this.rules.get(id)
    if (!existing) throw new Error(`Rule not found: ${id}`)
    const rule: GatewayRule = {
      ...existing,
      name: input.name,
      action: input.action,
      enabled: input.enabled ?? true,
      filters: input.filters ?? ["dns"],
      traffic: input.traffic,
      precedence: input.precedence,
      description: input.description,
    }
    this.rules.set(id, rule)
    return rule
  }

  async deleteGatewayRule(id: string): Promise<void> {
    this.rules.delete(id)
  }
}
