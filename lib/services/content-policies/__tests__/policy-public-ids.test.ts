import { describe, expect, it } from "vitest"

import {
  buildIdentityExpression,
  customerFacingGatewayPolicyName,
  uniqueCloudflareGatewayRuleName,
} from "@/lib/services/content-policies/policy-ownership"
import {
  mapGatewayRuleToListItem,
  mapPolicyTypeToAction,
} from "@/lib/services/content-policies/gateway-policies"
import type { GatewayRule } from "@/lib/services/cloudflare/rules"

describe("customer-facing Gateway policy identifiers", () => {
  it("maps Cloudflare rules to list items, then replaces the public id with the local UUID", () => {
    const rule: GatewayRule = {
      id: "cf-rule-secret",
      name: "Block malware",
      action: "block",
      enabled: true,
      filters: ["dns"],
      updated_at: "2026-08-16T00:00:00.000Z",
    }
    const localPolicyId = "11111111-2222-4333-8444-555555555555"
    const item = {
      ...mapGatewayRuleToListItem(rule),
      id: localPolicyId,
    }

    expect(item.id).toBe(localPolicyId)
    expect(item.status).toBe("configured")
    expect(item.id).not.toBe(rule.id)
    expect(JSON.stringify(item)).not.toContain("cf-rule-secret")
  })

  it("keeps identity selectors scoped to the SaaS user email", () => {
    expect(buildIdentityExpression('user@example.com')).toBe(
      'identity.email == "user@example.com"'
    )
    expect(buildIdentityExpression('a"b@example.com')).toBe(
      'identity.email == "a\\"b@example.com"'
    )
  })

  it("maps editor policy types to Gateway actions without inventing Cloudflare IDs", () => {
    expect(mapPolicyTypeToAction("block")).toBe("block")
    expect(mapPolicyTypeToAction("allow")).toBe("allow")
    expect(mapPolicyTypeToAction("safesearch")).toBe("safesearch")
    expect(mapPolicyTypeToAction("ytrestricted")).toBe("ytrestricted")
  })

  it("keeps the uniqueness timestamp on the Cloudflare rule name, not the customer name", () => {
    const unique = uniqueCloudflareGatewayRuleName(
      "SafeSearch on Supported Search Engines",
      new Date(1_787_260_470_054)
    )
    expect(unique).toBe(
      "SafeSearch on Supported Search Engines · 1787260470054"
    )
    expect(customerFacingGatewayPolicyName(unique)).toBe(
      "SafeSearch on Supported Search Engines"
    )
    expect(
      customerFacingGatewayPolicyName(
        "SafeSearch on Supported Search Engines",
        unique
      )
    ).toBe("SafeSearch on Supported Search Engines")
  })
})
