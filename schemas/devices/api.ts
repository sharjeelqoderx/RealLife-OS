import { z } from "zod"

import { devicePlatformSchema, deviceSetupAnswersSchema } from "@/schemas/devices/device"

export const renameDeviceSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "Device name is required")
    .max(80, "Device name must be at most 80 characters"),
})

export type RenameDeviceInput = z.infer<typeof renameDeviceSchema>

export const updateDeviceSetupSessionSchema = z.object({
  platform: devicePlatformSchema.optional(),
  answers: deviceSetupAnswersSchema.partial().optional(),
  cloudflareWizardStep: z.number().int().min(1).max(4).optional(),
})

export type UpdateDeviceSetupSessionInput = z.infer<
  typeof updateDeviceSetupSessionSchema
>

export const updateDeviceAppPreferencesSchema = z.object({
  lockFilterSwitch: z.boolean().optional(),
  preventLogout: z.boolean().optional(),
})

export type UpdateDeviceAppPreferencesInput = z.infer<
  typeof updateDeviceAppPreferencesSchema
>

export const deviceEnrollmentInfoSchema = z.object({
  tenantReady: z.boolean(),
  teamName: z.string().nullable(),
  installEmails: z.array(z.string()),
  dnsProfileAvailable: z.boolean(),
  dohSubdomain: z.string().nullable(),
  gatewayPolicyCount: z.number().int().nonnegative(),
  enrolledDeviceCount: z.number().int().nonnegative(),
  storeUrls: z.object({
    android: z.string().url(),
    iphone: z.string().url(),
  }),
  warpDownloadUrls: z.object({
    macos: z.string().url(),
    windows: z.string().url(),
  }),
})

export type DeviceEnrollmentInfo = z.infer<typeof deviceEnrollmentInfoSchema>

export const deviceSetupSessionSchema = z.object({
  platform: devicePlatformSchema,
  answers: deviceSetupAnswersSchema,
  cloudflareWizardStep: z.number().int().min(1).max(4),
  updatedAt: z.string(),
})

export type DeviceSetupSession = z.infer<typeof deviceSetupSessionSchema>

export const deviceAppPreferencesSchema = z.object({
  lockFilterSwitch: z.boolean(),
  preventLogout: z.boolean(),
  updatedAt: z.string(),
})

export type DeviceAppPreferences = z.infer<typeof deviceAppPreferencesSchema>
