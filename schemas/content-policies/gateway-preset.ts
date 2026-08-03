import { z } from "zod"

import { gatewayPolicyTypeSchema } from "@/schemas/content-policies/gateway-policy"

export const gatewayPresetCategorySchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  groupLabel: z.string().min(1).optional(),
})

export const gatewayPresetAppSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  groupLabel: z.string().min(1).optional(),
})

export const gatewayPresetSchema = z.object({
  id: z.string().min(1),
  type: gatewayPolicyTypeSchema,
  name: z.string().min(1),
  description: z.string().min(1),
  badgeText: z.string().optional(),
  categories: z.array(gatewayPresetCategorySchema).default([]),
  apps: z.array(gatewayPresetAppSchema).default([]),
  domains: z.array(z.string().min(1)).default([]),
})

export const gatewayPresetsResponseSchema = z.object({
  presets: z.array(gatewayPresetSchema),
})

export type GatewayPreset = z.infer<typeof gatewayPresetSchema>
export type GatewayPresetsResponse = z.infer<typeof gatewayPresetsResponseSchema>
