import { createAdminClient } from "@/lib/supabase/admin"
import type { Database } from "@/types/supabase"

import {
  decodeLogpushBody,
  parseLogpushPayload,
  type ParsedGatewayLog,
} from "@/lib/services/gateway-activity/parse-logpush"

type DeviceRow = Pick<
  Database["public"]["Tables"]["tenant_device_metadata"]["Row"],
  "id" | "user_id" | "display_name" | "cloudflare_device_id"
>

export type LogpushIngestResult = {
  received: number
  inserted: number
  duplicates: number
  unmapped: number
  invalid: number
}

export async function ingestGatewayLogpushPayload(input: {
  body: Buffer
  contentEncoding: string | null
  hintedDataset: string | null
}): Promise<LogpushIngestResult> {
  const text = decodeLogpushBody(input.body, input.contentEncoding)
  const parsed = parseLogpushPayload(text, input.hintedDataset)
  const lineCount = text.trim()
    ? text.trim().startsWith("[")
      ? parsed.length
      : text.split(/\r?\n/).filter((line) => line.trim()).length
    : 0

  if (parsed.length === 0) {
    return {
      received: lineCount,
      inserted: 0,
      duplicates: 0,
      unmapped: 0,
      invalid: Math.max(0, lineCount),
    }
  }

  const uniqueDeviceIds = [
    ...new Set(parsed.map((log) => log.cloudflareDeviceId)),
  ]
  const admin = createAdminClient()
  const { data: devices, error: deviceError } = await admin
    .from("tenant_device_metadata")
    .select("id, user_id, display_name, cloudflare_device_id")
    .in("cloudflare_device_id", uniqueDeviceIds)

  if (deviceError) {
    throw new Error(deviceError.message)
  }

  const deviceByCloudflareId = new Map<string, DeviceRow>()
  for (const row of devices ?? []) {
    deviceByCloudflareId.set(row.cloudflare_device_id, row)
  }

  const mapped: ParsedGatewayLog[] = []
  let unmapped = 0
  for (const log of parsed) {
    if (deviceByCloudflareId.has(log.cloudflareDeviceId)) {
      mapped.push(log)
    } else {
      unmapped += 1
    }
  }

  const invalid = Math.max(0, lineCount - parsed.length)

  if (mapped.length === 0) {
    return {
      received: lineCount,
      inserted: 0,
      duplicates: 0,
      unmapped,
      invalid,
    }
  }

  const rows = mapped.map((log) => {
    const device = deviceByCloudflareId.get(log.cloudflareDeviceId)
    if (!device) {
      throw new Error("Mapped device missing during ingest")
    }
    return {
      user_id: device.user_id,
      device_id: device.id,
      cloudflare_device_id: log.cloudflareDeviceId,
      dataset: log.dataset,
      occurred_at: log.occurredAt,
      hostname: log.hostname,
      url: log.url,
      action: log.action,
      policy_id: log.policyId,
      policy_name: log.policyName,
      application_name: log.applicationName,
      device_name: device.display_name,
      raw: log.raw as Database["public"]["Tables"]["gateway_activity_logs"]["Insert"]["raw"],
      event_fingerprint: log.fingerprint,
    }
  })

  const { error: insertError, count } = await admin
    .from("gateway_activity_logs")
    .upsert(rows, {
      onConflict: "event_fingerprint",
      ignoreDuplicates: true,
      count: "exact",
    })

  if (insertError) {
    throw new Error(insertError.message)
  }

  const inserted = count ?? 0

  return {
    received: lineCount,
    inserted,
    duplicates: Math.max(0, mapped.length - inserted),
    unmapped,
    invalid,
  }
}
