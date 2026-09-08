import { z } from "zod"

export const gatewayActivityDatasetSchema = z.enum([
  "gateway_dns",
  "gateway_http",
])

export const gatewayActivityLogSchema = z.object({
  id: z.string().uuid(),
  deviceId: z.string().uuid().nullable(),
  deviceName: z.string().nullable(),
  cloudflareDeviceId: z.string(),
  dataset: gatewayActivityDatasetSchema,
  occurredAt: z.string(),
  hostname: z.string().nullable(),
  url: z.string().nullable(),
  action: z.string().nullable(),
  policyId: z.string().nullable(),
  policyName: z.string().nullable(),
  applicationName: z.string().nullable(),
})

export const gatewayActivityListResponseSchema = z.object({
  logs: z.array(gatewayActivityLogSchema),
  nextCursor: z.string().nullable(),
})

export type GatewayActivityDataset = z.infer<
  typeof gatewayActivityDatasetSchema
>
export type GatewayActivityLog = z.infer<typeof gatewayActivityLogSchema>
export type GatewayActivityListResponse = z.infer<
  typeof gatewayActivityListResponseSchema
>
