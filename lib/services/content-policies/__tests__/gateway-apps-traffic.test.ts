import { describe, expect, it } from "vitest"

import { parseTrafficExpression } from "@/lib/services/content-policies/parse-gateway-rule"

describe("Gateway policy app selectors", () => {
  it("parses app.ids from DNS traffic expressions", () => {
    const parsed = parseTrafficExpression(
      'any(dns.content_category[*] in {1 2}) and any(app.ids[*] in {505 1190})'
    )
    expect(parsed.categoryIds).toEqual([1, 2])
    expect(parsed.appIds).toEqual([505, 1190])
  })

  it("parses a lone app.ids expression used for app-only policies", () => {
    expect(parseTrafficExpression('any(app.ids[*] in {1190})').appIds).toEqual([
      1190,
    ])
  })
})
