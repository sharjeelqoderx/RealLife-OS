export const authRoutes = [
  "/login",
  "/sign-up",
  "/forget-password",
  "/change-password",
] as const

export const protectedRoutes = ["/dashboard"] as const

export const defaultAuthenticatedPath = "/dashboard"
export const defaultUnauthenticatedPath = "/login"

export function isAuthRoute(pathname: string): boolean {
  return authRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )
}

export function isProtectedRoute(pathname: string): boolean {
  return protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )
}
