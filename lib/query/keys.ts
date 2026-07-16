export const queryKeys = {
  auth: {
    all: ["auth"] as const,
    recoverySession: () =>
      [...queryKeys.auth.all, "recovery-session"] as const,
  },
  billing: {
    all: ["billing"] as const,
    status: () => [...queryKeys.billing.all, "status"] as const,
  },
} as const
