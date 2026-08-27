import { describe, expect, it } from "vitest"

import {
  assignmentPrecedenceBase,
  buildFallbackDnsTrafficExpression,
  buildHttpTrafficExpression,
  FALLBACK_DNS_RESOLVER_IPS,
  shouldCreateFallbackDnsLayer,
  shouldCreateHttpLayer,
  youtubeDomainRootsForInput,
  youtubeNeedsExpandedCoverage,
  YOUTUBE_DOMAIN_ROOTS,
} from "@/lib/services/content-policies/gateway-policy-layers"

describe("Gateway policy layers", () => {
  it("blocks public fallback resolvers without Cloudflare 1.1.1.1", () => {
    const traffic = buildFallbackDnsTrafficExpression()
    expect(traffic).toContain("net.dst.port in {53 853}")
    expect(traffic).toContain("net.dst.ip in {")
    expect(traffic).not.toContain("net.dst.ip[*]")
    expect(traffic).toContain("8.8.8.8")
    expect(traffic).toContain("9.9.9.9")
    expect(FALLBACK_DNS_RESOLVER_IPS).not.toContain("1.1.1.1")
    expect(FALLBACK_DNS_RESOLVER_IPS).not.toContain("1.0.0.1")
    expect(traffic).not.toContain("1.1.1.1")
    expect(traffic).not.toContain("1.0.0.1")
  })

  it("expands YouTube coverage to CDN and API roots", () => {
    const roots = youtubeDomainRootsForInput({
      type: "block",
      apps: ["YouTube"],
      domainRoots: [],
    })
    expect(roots).toEqual(expect.arrayContaining([...YOUTUBE_DOMAIN_ROOTS]))
    expect(youtubeNeedsExpandedCoverage({
      type: "ytrestricted",
      apps: [],
      appIds: [],
    })).toBe(true)
  })

  it("builds HTTP traffic with Application selector or hosts", () => {
    expect(
      buildHttpTrafficExpression({ appIds: [505], hosts: [], domainRoots: [] })
    ).toBe("any(app.ids[*] in {505})")
    expect(
      buildHttpTrafficExpression({
        appIds: [],
        hosts: ["youtube.com"],
        domainRoots: ["googlevideo.com"],
      })
    ).toContain("http.request.host == \"youtube.com\"")
  })

  it("creates HTTP layer only for block/allow with traffic", () => {
    expect(shouldCreateHttpLayer("block", "any(app.ids[*] in {505})")).toBe(true)
    expect(shouldCreateHttpLayer("ytrestricted", "any(app.ids[*] in {505})")).toBe(
      false
    )
    expect(shouldCreateHttpLayer("safesearch", "http.request.host == \"x\"")).toBe(
      false
    )
    expect(shouldCreateFallbackDnsLayer("block")).toBe(true)
    expect(shouldCreateFallbackDnsLayer("allow")).toBe(false)
  })

  it("keeps allow precedence ahead of blocks in the same assignment class", () => {
    expect(
      assignmentPrecedenceBase({
        action: "allow",
        hasDeviceAssignment: true,
        hasAssignments: true,
      })
    ).toBeLessThan(
      assignmentPrecedenceBase({
        action: "block",
        hasDeviceAssignment: true,
        hasAssignments: true,
      })
    )
    expect(
      assignmentPrecedenceBase({
        action: "block",
        hasDeviceAssignment: false,
        hasAssignments: false,
      })
    ).toBeGreaterThan(40)
  })
})
