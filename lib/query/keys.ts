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
    list: (filters?: { q: string; status: string[]; type: string[] }) =>
      filters
        ? ([...queryKeys.gatewayPolicies.all, "list", filters] as const)
        : ([...queryKeys.gatewayPolicies.all, "list"] as const),
    detail: (policyId: string) =>
      [...queryKeys.gatewayPolicies.all, "detail", policyId] as const,
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
  devices: {
    all: ["devices"] as const,
    list: () => [...queryKeys.devices.all, "list"] as const,
    enrollmentInfo: () =>
      [...queryKeys.devices.all, "enrollment-info"] as const,
    enrollmentStatus: (enrollmentId: string) =>
      [...queryKeys.devices.all, "enrollment-status", enrollmentId] as const,
    setupSession: (platform: string) =>
      [...queryKeys.devices.all, "setup-session", platform] as const,
    appPreferences: () =>
      [...queryKeys.devices.all, "app-preferences"] as const,
    profiles: () => [...queryKeys.devices.all, "profiles"] as const,
    effectivePolicy: (deviceId: string) =>
      [...queryKeys.devices.all, "effective-policy", deviceId] as const,
  },
  policyAssignments: {
    all: ["policy-assignments"] as const,
    list: () => [...queryKeys.policyAssignments.all, "list"] as const,
  },
} as const
