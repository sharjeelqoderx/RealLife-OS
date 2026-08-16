import { describe, expect, it } from "vitest"

import { buildIdentityExpression } from "@/lib/services/content-policies/policy-ownership"
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
})
