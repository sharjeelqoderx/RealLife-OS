import { z } from "zod"

/**
 * Body for Cloudflare POST /accounts
 * @see https://developers.cloudflare.com/api/resources/accounts/methods/create
 */
export const createCloudflareAccountSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Account name is required")
    .max(100, "Account name must be at most 100 characters"),
  type: z.enum(["standard", "enterprise"]).optional().default("standard"),
  unitId: z
    .string()
    .trim()
    .min(1)
    .max(32)
    .optional()
    .describe("Optional Cloudflare Tenant unit ID"),
})

export type CreateCloudflareAccountInput = z.infer<
  typeof createCloudflareAccountSchema
>

export const cloudflareAccountSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["standard", "enterprise"]).optional(),
  created_on: z.string().optional(),
  managed_by: z
    .object({
      parent_org_id: z.string().optional(),
      parent_org_name: z.string().optional(),
    })
    .optional(),
  settings: z
    .object({
      abuse_contact_email: z.string().optional(),
      enforce_twofactor: z.boolean().optional(),
    })
    .optional(),
})

export type CloudflareAccount = z.infer<typeof cloudflareAccountSchema>
