import { createHash } from "node:crypto"
import { gunzipSync } from "node:zlib"

import type { GatewayActivityDataset } from "@/schemas/gateway-activity/activity-log"

const DATASETS = new Set<GatewayActivityDataset>([
  "gateway_dns",
  "gateway_http",
])

export type ParsedGatewayLog = {
  dataset: GatewayActivityDataset
  occurredAt: string
  cloudflareDeviceId: string
  hostname: string | null
  url: string | null
  action: string | null
  policyId: string | null
  policyName: string | null
  applicationName: string | null
  fingerprint: string
  raw: Record<string, unknown>
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null
  }
  return value as Record<string, unknown>
}

function readString(
  record: Record<string, unknown>,
  keys: string[]
): string | null {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === "string" && value.trim()) {
      return value.trim()
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value)
    }
  }
  return null
}

function readApplicationName(record: Record<string, unknown>): string | null {
  const named = readString(record, [
    "Application",
    "application",
    "ApplicationName",
    "applicationName",
    "AppName",
    "appName",
  ])
  if (named) return named

  for (const key of ["ApplicationIDs", "applicationIDs", "application_ids"]) {
    const value = record[key]
    if (Array.isArray(value) && value.length > 0) {
      return value
        .map((item) => (typeof item === "string" ? item : String(item)))
        .join(", ")
    }
    if (typeof value === "string" && value.trim()) {
      return value.trim()
    }
  }
  return null
}

export function inferGatewayDataset(
  record: Record<string, unknown>,
  hinted?: string | null
): GatewayActivityDataset | null {
  if (hinted && DATASETS.has(hinted as GatewayActivityDataset)) {
    return hinted as GatewayActivityDataset
  }

  const explicit = readString(record, ["Dataset", "dataset"])
  if (explicit && DATASETS.has(explicit as GatewayActivityDataset)) {
    return explicit as GatewayActivityDataset
  }

  const hasQuery = Boolean(
    readString(record, ["QueryName", "queryName", "query_name", "Query"])
  )
  const hasHttp = Boolean(
    readString(record, [
      "URL",
      "url",
      "HTTPHost",
      "httpHost",
      "Host",
      "host",
    ])
  )

  if (hasQuery && !hasHttp) return "gateway_dns"
  if (hasHttp && !hasQuery) return "gateway_http"
  if (hasHttp) return "gateway_http"
  if (hasQuery) return "gateway_dns"
  return null
}

function readOccurredAt(record: Record<string, unknown>): string | null {
  const raw = readString(record, [
    "Datetime",
    "datetime",
    "Time",
    "time",
    "Timestamp",
    "timestamp",
  ])
  if (!raw) return null
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

export function fingerprintGatewayLog(input: {
  dataset: GatewayActivityDataset
  occurredAt: string
  cloudflareDeviceId: string
  hostname: string | null
  url: string | null
  action: string | null
  policyId: string | null
}): string {
  return createHash("sha256")
    .update(
      [
        input.dataset,
        input.occurredAt,
        input.cloudflareDeviceId,
        input.hostname ?? "",
        input.url ?? "",
        input.action ?? "",
        input.policyId ?? "",
      ].join("\0")
    )
    .digest("hex")
}

export function parseGatewayLogRecord(
  value: unknown,
  hintedDataset?: string | null
): ParsedGatewayLog | null {
  const record = asRecord(value)
  if (!record) return null

  const cloudflareDeviceId = readString(record, [
    "DeviceID",
    "deviceID",
    "deviceId",
    "device_id",
  ])
  if (!cloudflareDeviceId) return null

  const dataset = inferGatewayDataset(record, hintedDataset)
  if (!dataset) return null

  const occurredAt = readOccurredAt(record)
  if (!occurredAt) return null

  const hostname = readString(record, [
    "QueryName",
    "queryName",
    "query_name",
    "HTTPHost",
    "httpHost",
    "Host",
    "host",
    "Hostname",
    "hostname",
  ])
  const url = readString(record, ["URL", "url"])
  const action = readString(record, ["Action", "action", "Decision", "decision"])
  const policyId = readString(record, [
    "PolicyID",
    "policyID",
    "policyId",
    "policy_id",
  ])
  const policyName = readString(record, [
    "PolicyName",
    "policyName",
    "policy_name",
  ])
  const applicationName = readApplicationName(record)

  return {
    dataset,
    occurredAt,
    cloudflareDeviceId,
    hostname,
    url,
    action,
    policyId,
    policyName,
    applicationName,
    fingerprint: fingerprintGatewayLog({
      dataset,
      occurredAt,
      cloudflareDeviceId,
      hostname,
      url,
      action,
      policyId,
    }),
    raw: record,
  }
}

export function decodeLogpushBody(
  raw: Buffer,
  contentEncoding: string | null
): string {
  const encoding = contentEncoding?.toLowerCase() ?? ""
  const isGzip =
    encoding.includes("gzip") ||
    (raw.length >= 2 && raw[0] === 0x1f && raw[1] === 0x8b)

  if (isGzip) {
    return gunzipSync(raw).toString("utf8")
  }
  return raw.toString("utf8")
}

export function parseLogpushPayload(
  text: string,
  hintedDataset?: string | null
): ParsedGatewayLog[] {
  const trimmed = text.trim()
  if (!trimmed) return []

  const records: unknown[] = []

  if (trimmed.startsWith("[")) {
    try {
      const parsed: unknown = JSON.parse(trimmed)
      if (Array.isArray(parsed)) {
        records.push(...parsed)
      }
    } catch {
      return []
    }
  } else if (trimmed.startsWith("{")) {
    for (const line of trimmed.split(/\r?\n/)) {
      const lineText = line.trim()
      if (!lineText) continue
      try {
        records.push(JSON.parse(lineText) as unknown)
      } catch {
        // skip malformed NDJSON lines
      }
    }
  }

  const logs: ParsedGatewayLog[] = []
  for (const record of records) {
    const parsed = parseGatewayLogRecord(record, hintedDataset)
    if (parsed) logs.push(parsed)
  }
  return logs
}
