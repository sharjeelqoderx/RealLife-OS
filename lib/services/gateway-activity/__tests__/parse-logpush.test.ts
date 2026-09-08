import { describe, expect, it } from "vitest"

import {
  fingerprintGatewayLog,
  parseLogpushPayload,
} from "@/lib/services/gateway-activity/parse-logpush"

describe("parseLogpushPayload", () => {
  it("parses gateway_dns NDJSON and fingerprints stably", () => {
    const line = JSON.stringify({
      Datetime: "2026-09-07T18:00:00.000Z",
      DeviceID: "cf-device-1",
      QueryName: "example.com",
      Action: "block",
      PolicyID: "pol-1",
      PolicyName: "Block adult",
      Application: "Chrome",
    })
    const [first] = parseLogpushPayload(line, "gateway_dns")
    const [second] = parseLogpushPayload(line, "gateway_dns")
    expect(first?.dataset).toBe("gateway_dns")
    expect(first?.hostname).toBe("example.com")
    expect(first?.action).toBe("block")
    expect(first?.policyName).toBe("Block adult")
    expect(first?.fingerprint).toBe(second?.fingerprint)
    expect(first?.fingerprint).toBe(
      fingerprintGatewayLog({
        dataset: "gateway_dns",
        occurredAt: "2026-09-07T18:00:00.000Z",
        cloudflareDeviceId: "cf-device-1",
        hostname: "example.com",
        url: null,
        action: "block",
        policyId: "pol-1",
      })
    )
  })

  it("parses gateway_http URL events", () => {
    const payload = JSON.stringify([
      {
        Datetime: "2026-09-07T18:01:00.000Z",
        DeviceID: "cf-device-2",
        URL: "https://youtube.com/watch?v=1",
        HTTPHost: "youtube.com",
        Action: "allow",
      },
    ])
    const [log] = parseLogpushPayload(payload)
    expect(log?.dataset).toBe("gateway_http")
    expect(log?.url).toBe("https://youtube.com/watch?v=1")
    expect(log?.hostname).toBe("youtube.com")
  })

  it("skips records without DeviceID", () => {
    const payload = JSON.stringify({
      Datetime: "2026-09-07T18:00:00.000Z",
      QueryName: "example.com",
      Action: "block",
    })
    expect(parseLogpushPayload(payload, "gateway_dns")).toEqual([])
  })
})
