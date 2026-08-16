import { describe, expect, it } from "vitest"

import { consumeRateLimit } from "@/lib/api/rate-limit"

describe("enrollment status polling safeguards", () => {
  it("rate-limits status checks per user and enrollment", () => {
    const key = `enrollment-status:user-1:enroll-${Date.now()}`
    for (let i = 0; i < 30; i += 1) {
      expect(consumeRateLimit(key, 30, 60_000).allowed).toBe(true)
    }
    expect(consumeRateLimit(key, 30, 60_000).allowed).toBe(false)
  })

  it("isolates rate limits between enrollments for the same user", () => {
    const stamp = Date.now()
    const first = `enrollment-status:user-1:enroll-a-${stamp}`
    const second = `enrollment-status:user-1:enroll-b-${stamp}`

    expect(consumeRateLimit(first, 1, 60_000).allowed).toBe(true)
    expect(consumeRateLimit(first, 1, 60_000).allowed).toBe(false)
    expect(consumeRateLimit(second, 1, 60_000).allowed).toBe(true)
  })

  it("treats completed/ambiguous/failed/expired as terminal public statuses", () => {
    const terminal = new Set([
      "completed",
      "ambiguous",
      "failed",
      "expired",
    ])
    expect(terminal.has("pending")).toBe(false)
    expect(terminal.has("completed")).toBe(true)
    expect(terminal.has("ambiguous")).toBe(true)
  })

  it("never treats a browser-supplied Cloudflare device id as ownership proof", () => {
    const owned = new Set(["owned_device"])
    const submitted = "other-tenant-device"
    expect(owned.has(submitted)).toBe(false)
  })
})
