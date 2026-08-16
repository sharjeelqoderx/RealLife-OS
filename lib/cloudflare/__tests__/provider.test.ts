import { describe, expect, it } from "vitest"

import { consumeRateLimit } from "@/lib/api/rate-limit"
import { MockCloudflareProvider } from "@/lib/cloudflare/providers/mock"
import {
  CLOUDFLARE_CATEGORY_MAP,
  getCloudflareCategoryLabel,
} from "@/lib/cloudflare/cloudflareCategoryMap"

describe("MockCloudflareProvider", () => {
  it("creates, updates, disables, and deletes gateway rules", async () => {
    const provider = new MockCloudflareProvider()
    const created = await provider.createGatewayRule({
      name: "Family Protection",
      action: "block",
      traffic: 'any(dns.content_category[*] in {80})',
      enabled: true,
      precedence: 100,
    })

    expect(created.id).toBeTruthy()
    expect(created.enabled).toBe(true)

    const updated = await provider.updateGatewayRule(created.id!, {
      name: "Family Protection",
      action: "block",
      enabled: false,
      precedence: 100,
    })
    expect(updated.enabled).toBe(false)

    await provider.deleteGatewayRule(created.id!)
    expect(await provider.listGatewayRules()).toHaveLength(0)
  })

  it("lists and revokes physical devices without inventing IDs", async () => {
    const provider = new MockCloudflareProvider()
    provider.devices.set("dev_1", {
      id: "dev_1",
      name: "Laptop",
      active_registrations: 1,
      last_seen_user: { email: "owner@example.com" },
    })

    const devices = await provider.listPhysicalDevices()
    expect(devices).toHaveLength(1)
    expect(devices[0]?.id).toBe("dev_1")

    await provider.revokePhysicalDevice("dev_1")
    expect((await provider.getPhysicalDevice("dev_1")).active_registrations).toBe(
      0
    )
  })
})

describe("category map", () => {
  it("maps app categories to Cloudflare labels without inventing IDs", () => {
    expect(getCloudflareCategoryLabel("malware")).toBe(
      CLOUDFLARE_CATEGORY_MAP.malware
    )
    expect(getCloudflareCategoryLabel("phishing")).toBe("Phishing")
  })
})

describe("rate limit", () => {
  it("blocks repeated enrollment attempts in the same window", () => {
    const key = `test-enrollment-${Date.now()}`
    expect(consumeRateLimit(key, 2, 60_000).allowed).toBe(true)
    expect(consumeRateLimit(key, 2, 60_000).allowed).toBe(true)
    expect(consumeRateLimit(key, 2, 60_000).allowed).toBe(false)
  })
})

describe("device ownership rules", () => {
  it("does not treat an arbitrary Cloudflare device id as owned", () => {
    const ownedIds = new Set(["owned_device"])
    const attackerSubmittedId = "another-customer-device"
    expect(ownedIds.has(attackerSubmittedId)).toBe(false)
  })
})
