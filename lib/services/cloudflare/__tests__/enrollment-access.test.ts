import { describe, expect, it } from "vitest"

import {
  buildUniqueEnrollmentPolicyName,
  buildWarpLoginMethods,
  isManagedEnrollmentPolicyName,
  mergeEmailIncludeRules,
  normalizeEmail,
  ruleAllowsEmail,
  selectWarpEnrollmentApp,
} from "@/lib/services/cloudflare/enrollment-access"

describe("WARP enrollment Access helpers", () => {
  it("ignores a non-WARP configured app id and uses the warp application", () => {
    const selected = selectWarpEnrollmentApp(
      [
        { id: "content-app", name: "Content Access", type: "self_hosted" },
        { id: "warp-app", name: "Warp", type: "warp" },
      ],
      "content-app"
    )
    expect(selected.id).toBe("warp-app")
  })

  it("uses the configured id when it is a warp application", () => {
    const selected = selectWarpEnrollmentApp(
      [
        { id: "warp-a", name: "Warp A", type: "warp" },
        { id: "warp-b", name: "Device enrollment", type: "warp" },
      ],
      "warp-a"
    )
    expect(selected.id).toBe("warp-a")
  })

  it("prefers an enrollment-named warp app when none is configured", () => {
    const selected = selectWarpEnrollmentApp([
      { id: "warp-a", name: "Other warp", type: "warp" },
      { id: "warp-b", name: "Device enrollment", type: "warp" },
    ])
    expect(selected.id).toBe("warp-b")
  })

  it("throws when no warp application exists", () => {
    expect(() =>
      selectWarpEnrollmentApp([
        { id: "content-app", name: "Content Access", type: "self_hosted" },
      ])
    ).toThrow(/WARP enrollment application/)
  })

  it("restricts empty allowed_idps to the OTP provider so Access can email a PIN", () => {
    expect(buildWarpLoginMethods("otp-1", [])).toEqual({
      allowedIdps: ["otp-1"],
      autoRedirectToIdentity: true,
    })
  })

  it("adds OTP beside existing IdPs and disables instant redirect", () => {
    expect(buildWarpLoginMethods("otp-1", ["google-1"])).toEqual({
      allowedIdps: ["google-1", "otp-1"],
      autoRedirectToIdentity: false,
    })
  })

  it("matches Access email include rules case-insensitively", () => {
    const email = normalizeEmail("User@Example.com")
    expect(
      ruleAllowsEmail({ email: { email: "user@example.com" } }, email)
    ).toBe(true)
    expect(
      ruleAllowsEmail({ email_domain: { domain: "example.com" } }, email)
    ).toBe(true)
    expect(ruleAllowsEmail({ everyone: {} }, email)).toBe(true)
  })

  it("adds an email include rule without duplicating it", () => {
    const merged = mergeEmailIncludeRules(
      [{ email: { email: "user@example.com" } }, { email: { email: "other@example.com" } }],
      "user@example.com"
    )
    expect(merged).toEqual([
      { email: { email: "other@example.com" } },
      { email: { email: "user@example.com" } },
    ])
  })

  it("builds a unique enrollment policy name with a unix timestamp", () => {
    const name = buildUniqueEnrollmentPolicyName(
      new Date("2026-08-20T20:19:00.123Z")
    )
    expect(name).toBe(
      `RealLife OS SaaS device enrollment · ${Date.parse("2026-08-20T20:19:00.123Z")}`
    )
    expect(isManagedEnrollmentPolicyName(name)).toBe(true)
    expect(isManagedEnrollmentPolicyName("Other policy")).toBe(false)
  })
})
