export const queryKeys = {
  auth: {
    all: ["auth"] as const,
    recoverySession: () =>
      [...queryKeys.auth.all, "recovery-session"] as const,
  },
  billing: {
    all: ["billing"] as const,
    status: () => [...queryKeys.billing.all, "status"] as const,
    details: () => [...queryKeys.billing.all, "details"] as const,
  },
  accessPolicies: {
    all: ["access-policies"] as const,
    list: () => [...queryKeys.accessPolicies.all, "list"] as const,
  },
  gatewayPolicies: {
    all: ["gateway-policies"] as const,
    list: () => [...queryKeys.gatewayPolicies.all, "list"] as const,
    categories: () => [...queryKeys.gatewayPolicies.all, "categories"] as const,
    apps: () => [...queryKeys.gatewayPolicies.all, "apps"] as const,
    locations: () => [...queryKeys.gatewayPolicies.all, "locations"] as const,
    presets: () => [...queryKeys.gatewayPolicies.all, "presets"] as const,
  },
  tenants: {
    all: ["tenants"] as const,
    provision: () => [...queryKeys.tenants.all, "provision"] as const,
  },
  cloudflareAccounts: {
    all: ["cloudflare-accounts"] as const,
    list: () => [...queryKeys.cloudflareAccounts.all, "list"] as const,
  },
} as const
