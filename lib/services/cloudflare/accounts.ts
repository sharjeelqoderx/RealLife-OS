import { cloudflareRequest } from "@/lib/cloudflare/client"
import {
  getCloudflareTenantAdminAuth,
  getCloudflareTenantUnitId,
} from "@/lib/cloudflare/config"
import type {
  CloudflareAccount,
  CreateCloudflareAccountInput,
} from "@/schemas/cloudflare/account"

type CreateAccountApiBody = {
  name: string
  type?: "standard" | "enterprise"
  unit?: { id: string }
}

/**
 * Create a Cloudflare account (Tenant admin only).
 * @see https://developers.cloudflare.com/api/resources/accounts/methods/create
 */
export async function createCloudflareAccount(
  input: CreateCloudflareAccountInput
): Promise<CloudflareAccount> {
  const auth = getCloudflareTenantAdminAuth()
  const unitId = input.unitId ?? getCloudflareTenantUnitId()

  const body: CreateAccountApiBody = {
    name: input.name,
    type: input.type,
  }

  if (unitId) {
    body.unit = { id: unitId }
  }

  return cloudflareRequest<CloudflareAccount>({
    method: "POST",
    path: "/accounts",
    auth,
    body,
  })
}

/**
 * List accounts visible to the configured Tenant admin / token.
 * Useful for admin tooling and reconciliation.
 */
export async function listCloudflareAccounts(): Promise<CloudflareAccount[]> {
  const auth = getCloudflareTenantAdminAuth()

  const result = await cloudflareRequest<CloudflareAccount[]>({
    method: "GET",
    path: "/accounts",
    auth,
  })

  return result ?? []
}

/**
 * Fetch a single account by ID.
 */
export async function getCloudflareAccount(
  accountId: string
): Promise<CloudflareAccount> {
  const auth = getCloudflareTenantAdminAuth()

  return cloudflareRequest<CloudflareAccount>({
    method: "GET",
    path: `/accounts/${accountId}`,
    auth,
  })
}
