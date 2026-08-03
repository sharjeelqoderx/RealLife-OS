import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { createCloudflareAccount } from "@/lib/services/cloudflare/accounts"
import { seedBaselineDnsPolicies } from "@/lib/services/cloudflare/baseline-rules"
import { ensureZeroTrustGateway } from "@/lib/services/cloudflare/gateway"
import { createGatewayLocation } from "@/lib/services/cloudflare/locations"
import type {
  ProvisionTenantInput,
  TenantCloudflareAccount,
  TenantProvisioningStatus,
} from "@/schemas/tenants/provision"

export class TenantProvisionError extends Error {
  readonly status: number
  readonly code: string

  constructor(message: string, status = 400, code = "PROVISION_FAILED") {
    super(message)
    this.name = "TenantProvisionError"
    this.status = status
    this.code = code
  }
}

type TenantRow = {
  id: string
  user_id: string
  cloudflare_account_id: string
  cloudflare_account_name: string
  account_type: "standard" | "enterprise" | null
  gateway_tag: string | null
  gateway_location_id: string | null
  doh_subdomain: string | null
  ipv4_destination: string | null
  ipv4_destination_backup: string | null
  status: TenantProvisioningStatus
  last_error: string | null
  created_at: string
  updated_at: string
}

function mapRow(row: TenantRow): TenantCloudflareAccount {
  return {
    id: row.id,
    userId: row.user_id,
    cloudflareAccountId: row.cloudflare_account_id,
    cloudflareAccountName: row.cloudflare_account_name,
    accountType: row.account_type,
    gatewayTag: row.gateway_tag,
    gatewayLocationId: row.gateway_location_id,
    dohSubdomain: row.doh_subdomain,
    ipv4Destination: row.ipv4_destination,
    ipv4DestinationBackup: row.ipv4_destination_backup,
    status: row.status,
    lastError: row.last_error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function getTenantCloudflareAccountForUser(
  userId: string
): Promise<TenantCloudflareAccount | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("tenant_cloudflare_accounts")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle()

  if (error) {
    // Table may not be migrated yet — treat as "no tenant mapping".
    console.warn(
      "getTenantCloudflareAccountForUser: falling back (no tenant row / table):",
      error.message
    )
    return null
  }

  return data ? mapRow(data as TenantRow) : null
}

/**
 * Phase 1 §3.6 — Tenant onboarding automation:
 * 1. Create Cloudflare child account (Tenant API POST /accounts)
 * 2. Enable Zero Trust Gateway on that account
 * 3. Create Gateway location with DoH + DoT (device setup)
 * 4. Seed baseline DNS policies (SafeSearch + DoH block)
 * 5. Persist mapping in Supabase (RLS-isolated per user)
 */
export async function provisionTenantCloudflareAccount(
  input: ProvisionTenantInput
): Promise<TenantCloudflareAccount> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new TenantProvisionError("Unauthorized", 401, "UNAUTHORIZED")
  }

  const existing = await getTenantCloudflareAccountForUser(user.id)
  if (existing?.status === "ready") {
    return existing
  }

  const admin = createAdminClient()

  // Mark provisioning / create placeholder row
  const { data: stub, error: stubError } = await admin
    .from("tenant_cloudflare_accounts")
    .upsert(
      {
        user_id: user.id,
        cloudflare_account_id: existing?.cloudflareAccountId ?? "pending",
        cloudflare_account_name: input.accountName,
        account_type: input.accountType ?? "standard",
        status: "provisioning",
        last_error: null,
      },
      { onConflict: "user_id" }
    )
    .select("*")
    .single()

  if (stubError || !stub) {
    console.error("provision stub upsert:", stubError)
    throw new TenantProvisionError(
      "Failed to start tenant provisioning",
      500,
      "DB_ERROR"
    )
  }

  try {
    // 1) Create Cloudflare child account (skip if already created)
    let cloudflareAccountId = existing?.cloudflareAccountId
    let accountType = input.accountType ?? "standard"

    if (!cloudflareAccountId || cloudflareAccountId === "pending") {
      const account = await createCloudflareAccount({
        name: input.accountName,
        type: input.accountType,
        unitId: input.unitId,
      })
      cloudflareAccountId = account.id
      accountType = account.type ?? accountType
    }

    // 2) Enable Zero Trust Gateway
    const gateway = await ensureZeroTrustGateway(cloudflareAccountId)

    // 3) Create DNS location (DoH for iOS, DoT for Android)
    const locationName = input.locationName ?? `${input.accountName} Home`
    const location = await createGatewayLocation(cloudflareAccountId, {
      name: locationName,
      clientDefault: true,
      enableDoh: true,
      enableDot: true,
    })

    // 4) Baseline Phase 1 policies
    if (input.seedBaselinePolicies !== false) {
      await seedBaselineDnsPolicies(cloudflareAccountId)
    }

    // 5) Persist ready state
    const { data: saved, error: saveError } = await admin
      .from("tenant_cloudflare_accounts")
      .update({
        cloudflare_account_id: cloudflareAccountId,
        cloudflare_account_name: input.accountName,
        account_type: accountType,
        gateway_tag: gateway.gateway_tag ?? null,
        gateway_location_id: location.id ?? null,
        doh_subdomain: location.doh_subdomain ?? null,
        ipv4_destination: location.ipv4_destination ?? null,
        ipv4_destination_backup: location.ipv4_destination_backup ?? null,
        status: "ready",
        last_error: null,
      })
      .eq("user_id", user.id)
      .select("*")
      .single()

    if (saveError || !saved) {
      console.error("provision save:", saveError)
      throw new TenantProvisionError(
        "Cloudflare provisioned but failed to save mapping",
        500,
        "DB_SAVE_ERROR"
      )
    }

    return mapRow(saved as TenantRow)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Tenant provisioning failed"

    await admin
      .from("tenant_cloudflare_accounts")
      .update({
        status: "failed",
        last_error: message,
      })
      .eq("user_id", user.id)

    if (error instanceof TenantProvisionError) {
      throw error
    }

    throw new TenantProvisionError(message, 502, "CLOUDFLARE_PROVISION_FAILED")
  }
}
