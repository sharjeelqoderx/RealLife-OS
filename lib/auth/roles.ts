export const AUTH_ROLES = {
  USER: "USER",
  ADMIN: "ADMIN",
} as const

export type AuthRole = (typeof AUTH_ROLES)[keyof typeof AUTH_ROLES]

function readRole(value: unknown): AuthRole | null {
  if (value === AUTH_ROLES.ADMIN) return AUTH_ROLES.ADMIN
  if (value === AUTH_ROLES.USER) return AUTH_ROLES.USER
  return null
}

/**
 * Auth role for authorization.
 * ADMIN is trusted only from `app_metadata.role` (service-role writable).
 * Signup always sets USER; customers never become ADMIN via sign-up.
 */
export function getAuthUserRole(user: {
  app_metadata?: Record<string, unknown>
  user_metadata?: Record<string, unknown>
}): AuthRole {
  const appRole = readRole(user.app_metadata?.role)
  if (appRole === AUTH_ROLES.ADMIN) return AUTH_ROLES.ADMIN
  return AUTH_ROLES.USER
}

export function isAdminRole(user: {
  app_metadata?: Record<string, unknown>
  user_metadata?: Record<string, unknown>
}): boolean {
  return getAuthUserRole(user) === AUTH_ROLES.ADMIN
}
