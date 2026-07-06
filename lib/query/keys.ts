export const queryKeys = {
  auth: {
    all: ["auth"] as const,
    resetToken: (id: string) => [...queryKeys.auth.all, "reset-token", id] as const,
  },
} as const
