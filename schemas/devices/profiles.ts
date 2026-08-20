import { z } from "zod"

export const deviceProfileCreateSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(500).optional().nullable(),
})

export const deviceProfileUpdateSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  description: z.string().trim().max(500).optional().nullable(),
})

export const deviceProfileAddDeviceSchema = z.object({
  deviceId: z.string().uuid(),
})

export const policyAssignmentCreateSchema = z.object({
  policyId: z.string().uuid(),
  targetType: z.enum(["device", "profile"]),
  targetId: z.string().uuid(),
})

export type DeviceProfileCreateInput = z.infer<typeof deviceProfileCreateSchema>
export type DeviceProfileUpdateInput = z.infer<typeof deviceProfileUpdateSchema>
export type PolicyAssignmentCreateInput = z.infer<
  typeof policyAssignmentCreateSchema
>
