import { describe, expect, it } from "vitest"

import { resolveEffectivePolicyFromState } from "@/lib/services/policy-assignments/resolve-effective-policy"

describe("resolveEffectivePolicyFromState", () => {
  const kids = { id: "profile-kids", name: "Kids" }
  const kidsPolicy = { id: "pol-kids", name: "Kids Policy" }
  const emergency = { id: "pol-emergency", name: "Emergency Policy" }
  const workPolicy = { id: "pol-work", name: "Work Policy" }

  it("prefers direct device assignment over profile", () => {
    const result = resolveEffectivePolicyFromState({
      deviceId: "ipad",
      profile: kids,
      devicePolicy: emergency,
      profilePolicy: kidsPolicy,
    })
    expect(result.source).toBe("device")
    expect(result.effectivePolicy).toEqual(emergency)
  })

  it("falls back to profile policy when direct removed", () => {
    const result = resolveEffectivePolicyFromState({
      deviceId: "ipad",
      profile: kids,
      devicePolicy: null,
      profilePolicy: kidsPolicy,
    })
    expect(result.source).toBe("profile")
    expect(result.effectivePolicy).toEqual(kidsPolicy)
  })

  it("updates when device moves to another profile", () => {
    const result = resolveEffectivePolicyFromState({
      deviceId: "ipad",
      profile: { id: "profile-work", name: "Work" },
      devicePolicy: null,
      profilePolicy: workPolicy,
    })
    expect(result.source).toBe("profile")
    expect(result.effectivePolicy).toEqual(workPolicy)
  })

  it("returns none when unassigned", () => {
    const result = resolveEffectivePolicyFromState({
      deviceId: "ipad",
      profile: null,
      devicePolicy: null,
      profilePolicy: null,
    })
    expect(result.source).toBe("none")
    expect(result.effectivePolicy).toBeNull()
  })
})
