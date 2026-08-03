import { z } from "zod"

/**
 * Provision a family/tenant onto Cloudflare Tenant (child account) + Gateway.
 * Maps Phase 1 §3.6 multi-tenant onboarding automation.
 */
export const provisionTenantSchema = z.object({
  /** Display name for the Cloudflare child account (e.g. family / household). */
  accountName: z
    .string()
    .trim()
    .min(1, "Account name is required")
    .max(100, "Account name must be at most 100 characters"),
  accountType: z.enum(["standard", "enterprise"]).optional().default("standard"),
  /** Optional override for Tenant unit; falls back to env CLOUDFARE_TENANT_UNIT_ID. */
  unitId: z.string().trim().min(1).max(32).optional(),
  /**
   * Gateway location name used for DNS endpoints (DoH / DoT).
   * Defaults to "{accountName} Home".
   */
  locationName: z.string().trim().min(1).max(100).optional(),
  /** When true (default), seed Phase 1 baseline DNS policies (SafeSearch + DoH block). */
  seedBaselinePolicies: z.boolean().optional().default(true),
})

export type ProvisionTenantInput = z.infer<typeof provisionTenantSchema>

export const tenantProvisioningStatusSchema = z.enum([
  "pending",
  "provisioning",
  "ready",
  "failed",
])

export type TenantProvisioningStatus = z.infer<
  typeof tenantProvisioningStatusSchema
>

export const tenantCloudflareAccountSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  cloudflareAccountId: z.string(),
  cloudflareAccountName: z.string(),
  accountType: z.enum(["standard", "enterprise"]).nullable(),
  gatewayTag: z.string().nullable(),
  gatewayLocationId: z.string().nullable(),
  dohSubdomain: z.string().nullable(),
  ipv4Destination: z.string().nullable(),
  ipv4DestinationBackup: z.string().nullable(),
  status: tenantProvisioningStatusSchema,
  lastError: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type TenantCloudflareAccount = z.infer<
  typeof tenantCloudflareAccountSchema
>
