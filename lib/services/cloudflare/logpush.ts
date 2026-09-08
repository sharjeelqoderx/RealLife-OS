import { CloudflareApiError, cloudflareRequest } from "@/lib/cloudflare/client"
import {
  getCloudflareAccountId,
  getCloudflareGatewayAuth,
} from "@/lib/cloudflare/config"
import { getCloudflareLogpushSecret, getSiteUrl } from "@/lib/env"

export const GATEWAY_LOGPUSH_DATASETS = [
  "gateway_dns",
  "gateway_http",
] as const

export type GatewayLogpushDataset = (typeof GATEWAY_LOGPUSH_DATASETS)[number]

export type CloudflareLogpushJob = {
  id?: number
  dataset?: string
  name?: string
  enabled?: boolean
  destination_conf?: string
  error_message?: string
  last_error?: string
  last_error_message?: string
}

export class LogpushPermissionError extends Error {
  readonly status = 403
  readonly code = "LOGPUSH_PERMISSION_DENIED"

  constructor(message: string) {
    super(message)
    this.name = "LogpushPermissionError"
  }
}

function jobNameForDataset(dataset: GatewayLogpushDataset): string {
  return `reallife-os-${dataset}`
}

export function buildLogpushDestinationConf(
  siteUrl: string,
  secret: string,
  dataset: GatewayLogpushDataset
): string {
  const destination = new URL("/api/cloudflare/logpush", `${siteUrl}/`)
  destination.searchParams.set("dataset", dataset)
  destination.searchParams.set("header_X-Logpush-Secret", secret)
  return destination.toString()
}

function wrapLogpushError(error: unknown): never {
  if (error instanceof CloudflareApiError && (error.status === 403 || error.status === 401)) {
    throw new LogpushPermissionError(
      "Cloudflare API token cannot manage Logpush jobs. Add Account Logs Edit (Logpush) and retry, or create the jobs in the Cloudflare dashboard."
    )
  }
  throw error
}

export async function listGatewayLogpushJobs(
  accountId = getCloudflareAccountId()
): Promise<CloudflareLogpushJob[]> {
  try {
    const jobs = await cloudflareRequest<CloudflareLogpushJob[]>({
      method: "GET",
      path: `/accounts/${accountId}/logpush/jobs`,
      auth: getCloudflareGatewayAuth(),
    })
    return jobs ?? []
  } catch (error) {
    wrapLogpushError(error)
  }
}

export async function ensureGatewayLogpushJobs(input?: {
  accountId?: string
  siteUrl?: string
}): Promise<{
  jobs: CloudflareLogpushJob[]
  created: GatewayLogpushDataset[]
  existing: GatewayLogpushDataset[]
  destinationHost: string
}> {
  const accountId = input?.accountId ?? getCloudflareAccountId()
  const secret = getCloudflareLogpushSecret()
  const siteUrl = (input?.siteUrl ?? getSiteUrl()).replace(/\/$/, "")
  const destinationHost = new URL(siteUrl).host
  const jobs = await listGatewayLogpushJobs(accountId)
  const created: GatewayLogpushDataset[] = []
  const existing: GatewayLogpushDataset[] = []
  const result: CloudflareLogpushJob[] = []

  for (const dataset of GATEWAY_LOGPUSH_DATASETS) {
    const name = jobNameForDataset(dataset)
    const found = jobs.find(
      (job) => job.dataset === dataset && job.name === name
    )
    if (found) {
      existing.push(dataset)
      result.push(found)
      continue
    }

    try {
      const createdJob = await cloudflareRequest<CloudflareLogpushJob>({
        method: "POST",
        path: `/accounts/${accountId}/logpush/jobs`,
        auth: getCloudflareGatewayAuth(),
        body: {
          name,
          dataset,
          enabled: true,
          destination_conf: buildLogpushDestinationConf(
            siteUrl,
            secret,
            dataset
          ),
        },
      })
      created.push(dataset)
      result.push(createdJob)
    } catch (error) {
      wrapLogpushError(error)
    }
  }

  return { jobs: result, created, existing, destinationHost }
}
